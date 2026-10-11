import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;

    const body = await req.json();
    const { operation } = body;

    switch (operation) {
      case "send": {
        const { wallet_id, amount, currency, recipient, description } = body;
        if (!wallet_id || !amount || amount <= 0) throw new Error("Invalid parameters");

        const { data: wallet, error: wErr } = await supabase
          .from("wallets").select("*").eq("id", wallet_id).eq("user_id", userId).maybeSingle();
        if (wErr || !wallet) throw new Error("Wallet not found");
        if (wallet.balance < amount) throw new Error("Insufficient balance");

        await supabase.from("wallets").update({ balance: wallet.balance - amount }).eq("id", wallet_id);
        await supabase.from("transactions").insert({
          user_id: userId, type: "send", amount: -(body.usd_amount ?? amount),
          description: description ?? `Sent ${amount} ${currency} to ${recipient}`,
          recipient, status: "completed",
          metadata: { currency, original_amount: amount },
        });
        return ok({ success: true });
      }

      case "savings_transfer": {
        const { direction, amount } = body;
        if (!amount || amount <= 0) throw new Error("Invalid amount");

        const { data: wallet, error: wErr } = await supabase
          .from("wallets").select("*").eq("user_id", userId).eq("currency", "USD").maybeSingle();
        if (wErr || !wallet) throw new Error("USD wallet not found");

        if (direction === "to_savings") {
          if (wallet.balance < amount) throw new Error("Insufficient wallet balance");
          await supabase.from("wallets").update({
            balance: wallet.balance - amount,
            savings_balance: (wallet.savings_balance ?? 0) + amount,
          }).eq("id", wallet.id);
          await supabase.from("transactions").insert({
            user_id: userId, type: "deposit", amount: -amount,
            description: `Transfer to Savings — 6.0% APY`, status: "completed",
            metadata: { savings_transfer: true, direction: "to_savings" },
          });
        } else if (direction === "to_wallet") {
          if ((wallet.savings_balance ?? 0) < amount) throw new Error("Insufficient savings balance");
          await supabase.from("wallets").update({
            balance: wallet.balance + amount,
            savings_balance: (wallet.savings_balance ?? 0) - amount,
          }).eq("id", wallet.id);
          await supabase.from("transactions").insert({
            user_id: userId, type: "deposit", amount,
            description: "Withdrawal from Savings", status: "completed",
            metadata: { savings_transfer: true, direction: "to_wallet" },
          });
        } else {
          throw new Error("Invalid direction");
        }
        return ok({ success: true });
      }

      case "crypto_trade": {
        const code = String(body.code || "");
        const action = String(body.action || "");
        const quoted = finitePositive(body.price, "price");
        if (!code) throw new Error("Invalid parameters");
        const price = await liveUsdPrice(code, quoted);

        const { data: usdWallet, error: wErr } = await supabase
          .from("wallets").select("*").eq("user_id", userId).eq("currency", "USD").maybeSingle();
        if (wErr || !usdWallet) throw new Error("No USD wallet");

        if (action === "buy") {
          const usd = finitePositive(body.amount, "amount");
          if (Number(usdWallet.balance) + 1e-8 < usd) throw new Error("Insufficient USD balance");
          const units = usd / price;
          const { error: uErr } = await supabase.from("wallets")
            .update({ balance: Number(usdWallet.balance) - usd }).eq("id", usdWallet.id);
          if (uErr) throw new Error(uErr.message);
          await upsertCryptoHolding(supabase, userId, code, units, price);
          await supabase.from("transactions").insert({
            user_id: userId, type: "purchase", amount: -usd, status: "completed",
            description: `Bought ${units.toFixed(6)} ${code} at $${price.toLocaleString()}`,
            metadata: { crypto: code, crypto_amount: units, price_per_unit: price, action: "buy" },
          });
        } else if (action === "sell") {
          const units = finitePositive(body.amount, "amount");
          const holding = await getCryptoHolding(supabase, userId, code);
          if (holding + 1e-12 < units) throw new Error(`Insufficient ${code} balance`);
          const credit = units * price;
          const { error: uErr } = await supabase.from("wallets")
            .update({ balance: Number(usdWallet.balance) + credit }).eq("id", usdWallet.id);
          if (uErr) throw new Error(uErr.message);
          await upsertCryptoHolding(supabase, userId, code, -units, price);
          await supabase.from("transactions").insert({
            user_id: userId, type: "purchase", amount: credit, status: "completed",
            description: `Sold ${units.toFixed(6)} ${code} at $${price.toLocaleString()}`,
            metadata: { crypto: code, crypto_amount: units, price_per_unit: price, action: "sell" },
          });
        } else {
          throw new Error("Invalid action");
        }
        return ok({ success: true });
      }

      case "crypto_send": {
        const code = String(body.code || "");
        const units = finitePositive(body.amount, "amount");
        const address = String(body.address || body.recipient || "").slice(0, 200);
        if (!code || !address) throw new Error("Invalid parameters");
        const holding = await getCryptoHolding(supabase, userId, code);
        if (holding + 1e-12 < units) throw new Error(`Insufficient ${code} balance`);
        await upsertCryptoHolding(supabase, userId, code, -units, Number(body.price) || 0);
        await supabase.from("transactions").insert({
          user_id: userId, type: "send", amount: -(units * (Number(body.price) || 0)), status: "completed",
          description: `Sent ${units.toFixed(6)} ${code}`,
          recipient: address,
          metadata: { crypto: code, crypto_amount: units, action: "crypto_send", wallet_address: address },
        });
        return ok({ success: true });
      }

      case "crypto_swap": {
        const from = String(body.code || body.from || "");
        const to = String(body.swap_to || body.to || "");
        const units = finitePositive(body.amount, "amount");
        const fromPrice = await liveUsdPrice(from, finitePositive(body.price, "price"));
        const toPrice = await liveUsdPrice(to, finitePositive(body.swap_to_price, "swap price"));
        if (!from || !to || from === to) throw new Error("Invalid swap pair");
        const holding = await getCryptoHolding(supabase, userId, from);
        if (holding + 1e-12 < units) throw new Error(`Insufficient ${from} balance`);
        const received = (units * fromPrice) / toPrice;
        await upsertCryptoHolding(supabase, userId, from, -units, fromPrice);
        await upsertCryptoHolding(supabase, userId, to, received, toPrice);
        await supabase.from("transactions").insert({
          user_id: userId, type: "conversion", amount: -units, status: "completed",
          description: `Swapped ${units.toFixed(6)} ${from} → ${received.toFixed(6)} ${to}`,
          metadata: { from, to, amount: units, received, action: "swap" },
        });
        return ok({ success: true, received });
      }

      case "stock_trade": {
        const ticker = String(body.ticker || "");
        const action = String(body.action || "");
        const shares = finitePositive(body.shares, "shares");
        const quoted = finitePositive(body.price, "price");
        if (!ticker) throw new Error("Invalid parameters");
        const price = await liveStockPrice(ticker, quoted);
        const dollars = shares * price;

        const { data: usdWallet, error: wErr } = await supabase
          .from("wallets").select("*").eq("user_id", userId).eq("currency", "USD").maybeSingle();
        if (wErr || !usdWallet) throw new Error("No USD wallet");

        if (action === "buy") {
          if (Number(usdWallet.balance) + 1e-8 < dollars) throw new Error("Insufficient USD balance");
          const { error: uErr } = await supabase.from("wallets")
            .update({ balance: Number(usdWallet.balance) - dollars }).eq("id", usdWallet.id);
          if (uErr) throw new Error(uErr.message);
          await upsertStockHolding(supabase, userId, ticker, shares, price);
          await supabase.from("transactions").insert({
            user_id: userId, type: "purchase", amount: -dollars, status: "completed",
            description: `Bought ${shares.toFixed(4)} shares of ${ticker} at $${price.toFixed(2)}`,
            metadata: { stock: ticker, shares, price_per_share: price, action: "stock_buy" },
          });
        } else if (action === "sell") {
          const currentShares = await getStockShares(supabase, userId, ticker);
          if (currentShares + 1e-8 < shares) throw new Error(`Insufficient ${ticker} shares`);
          const { error: uErr } = await supabase.from("wallets")
            .update({ balance: Number(usdWallet.balance) + dollars }).eq("id", usdWallet.id);
          if (uErr) throw new Error(uErr.message);
          await upsertStockHolding(supabase, userId, ticker, -shares, price);
          await supabase.from("transactions").insert({
            user_id: userId, type: "purchase", amount: dollars, status: "completed",
            description: `Sold ${shares.toFixed(4)} shares of ${ticker} at $${price.toFixed(2)}`,
            metadata: { stock: ticker, shares, price_per_share: price, action: "stock_sell" },
          });
        } else {
          throw new Error("Invalid action");
        }
        return ok({ success: true });
      }

      case "demo_deposit": {
        const amount = finitePositive(body.amount, "amount");
        if (amount > 100000) throw new Error("Demo deposits are capped at $100,000");
        const { data: wallet, error: wErr } = await supabase
          .from("wallets").select("*").eq("user_id", userId).eq("currency", "USD").maybeSingle();
        if (wErr || !wallet) throw new Error("USD wallet not found");
        const { error: uErr } = await supabase.from("wallets")
          .update({ balance: Number(wallet.balance) + amount }).eq("id", wallet.id);
        if (uErr) throw new Error(uErr.message);
        const method = body.method === "bank" ? "Bank transfer deposit (demo)" : "Card deposit (demo)";
        await supabase.from("transactions").insert({
          user_id: userId, type: "deposit", amount, status: "completed", description: method,
        });
        return ok({ success: true });
      }

      case "bill_pay": {
        const amount = finitePositive(body.amount, "amount");
        const name = String(body.biller_name || "bill").slice(0, 80);
        const { data: wallet, error: wErr } = await supabase
          .from("wallets").select("*").eq("user_id", userId).eq("currency", "USD").maybeSingle();
        if (wErr || !wallet) throw new Error("USD wallet not found");
        if (Number(wallet.balance) + 1e-8 < amount) throw new Error("Insufficient balance");
        const cashback = Math.round(amount * 0.01 * 100) / 100;
        const { error: uErr } = await supabase.from("wallets")
          .update({ balance: Number(wallet.balance) - amount + cashback }).eq("id", wallet.id);
        if (uErr) throw new Error(uErr.message);
        await supabase.from("transactions").insert([
          { user_id: userId, type: "bill_payment", amount: -amount, status: "completed", description: `Bill payment — ${name}` },
          { user_id: userId, type: "cashback", amount: cashback, status: "completed", description: `1% cashback — ${name}` },
        ]);
        return ok({ success: true, cashback });
      }

      case "qr_pay": {
        const amount = finitePositive(body.amount, "amount");
        const recipient = String(body.recipient || "").slice(0, 120);
        const note = String(body.note || "").slice(0, 140);
        if (!recipient) throw new Error("Recipient required");
        const { data: wallet, error: wErr } = await supabase
          .from("wallets").select("*").eq("user_id", userId).eq("currency", "USD").maybeSingle();
        if (wErr || !wallet) throw new Error("USD wallet not found");
        if (Number(wallet.balance) + 1e-8 < amount) throw new Error("Insufficient balance");
        const { error: uErr } = await supabase.from("wallets")
          .update({ balance: Number(wallet.balance) - amount }).eq("id", wallet.id);
        if (uErr) throw new Error(uErr.message);
        await supabase.from("transactions").insert({
          user_id: userId, type: "send", amount: -amount, status: "completed", recipient,
          description: `QR Payment to ${recipient}${note ? ` — ${note}` : ""}`,
        });
        return ok({ success: true });
      }

      case "convert": {
        const { from_currency, to_currency } = body;
        const amount = Number(body.amount);
        const rate = await checkedRate(String(from_currency), String(to_currency), Number(body.rate));

        if (!from_currency || !to_currency) {
          throw new Error("Missing from/to currency");
        }
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("Invalid amount");
        }
        if (!Number.isFinite(rate) || rate <= 0) {
          throw new Error("Invalid or missing exchange rate — wait for live rates and try again");
        }
        if (from_currency === to_currency) {
          throw new Error("Currencies must be different");
        }

        const { data: fromWallet, error: fErr } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", userId)
          .eq("currency", from_currency)
          .maybeSingle();

        if (fErr) throw new Error(`Wallet lookup failed: ${fErr.message}`);
        if (!fromWallet) throw new Error(`No ${from_currency} wallet`);

        // Float-safe: allow tiny rounding drift
        if (fromWallet.balance + 1e-8 < amount) {
          throw new Error(
            `Insufficient ${from_currency} balance (have ${Number(fromWallet.balance).toFixed(2)}, need ${amount.toFixed(2)})`,
          );
        }

        const debit = Math.min(amount, fromWallet.balance);

        let { data: toWallet } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", userId)
          .eq("currency", to_currency)
          .maybeSingle();

        if (!toWallet) {
          const { data: newWallet, error: cErr } = await supabase
            .from("wallets")
            .insert({
              user_id: userId,
              balance: 0,
              savings_balance: 0,
              currency: to_currency,
            })
            .select()
            .maybeSingle();
          if (cErr) throw new Error(`Could not create ${to_currency} wallet: ${cErr.message}`);
          toWallet = newWallet;
        }
        if (!toWallet) throw new Error(`Could not open ${to_currency} wallet`);

        const convertedAmount = debit * rate;

        const { error: u1 } = await supabase
          .from("wallets")
          .update({ balance: fromWallet.balance - debit })
          .eq("id", fromWallet.id);
        if (u1) throw new Error(`Debit failed: ${u1.message}`);

        const { error: u2 } = await supabase
          .from("wallets")
          .update({ balance: (toWallet.balance ?? 0) + convertedAmount })
          .eq("id", toWallet.id);
        if (u2) throw new Error(`Credit failed: ${u2.message}`);

        await supabase.from("transactions").insert({
          user_id: userId,
          type: "conversion",
          amount: -Math.abs(debit),
          status: "completed",
          description: `Converted ${debit.toFixed(2)} ${from_currency} → ${convertedAmount.toFixed(4)} ${to_currency}`,
          metadata: {
            from: from_currency,
            to: to_currency,
            from_amount: debit,
            to_amount: convertedAmount,
            rate,
          },
        });

        return ok({ success: true, convertedAmount });
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

function finitePositive(value: unknown, label: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid ${label}`);
  return n;
}

let usdRatesCache: { at: number; rates: Record<string, number> } | null = null;

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", USDT: "tether", BNB: "binancecoin",
  XRP: "ripple", ADA: "cardano", DOGE: "dogecoin", SOL: "solana",
  TRX: "tron", DOT: "polkadot", MATIC: "matic-network", LTC: "litecoin",
  SHIB: "shiba-inu", AVAX: "avalanche-2", UNI: "uniswap", LINK: "chainlink",
  ATOM: "cosmos", XMR: "monero", ETC: "ethereum-classic", BCH: "bitcoin-cash",
  XLM: "stellar", ALGO: "algorand", FIL: "filecoin", VET: "vechain",
  ICP: "internet-computer", APT: "aptos", HBAR: "hedera-hashgraph",
  NEAR: "near", ARB: "arbitrum", OP: "optimism",
};

async function usdPerUnitRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (usdRatesCache && now - usdRatesCache.at < 60_000) return usdRatesCache.rates;
  const rates: Record<string, number> = { USD: 1 };
  const fiat = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!fiat.ok) throw new Error("Could not load exchange rates");
  const fiatJson = await fiat.json();
  if (fiatJson?.rates) {
    for (const [code, value] of Object.entries(fiatJson.rates as Record<string, number>)) {
      if (typeof value === "number" && value > 0) rates[code] = value;
    }
  }
  try {
    const ids = Object.values(COINGECKO_IDS).join(",");
    const crypto = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
    );
    if (crypto.ok) {
      const data = await crypto.json();
      for (const [code, id] of Object.entries(COINGECKO_IDS)) {
        const usd = data?.[id]?.usd;
        if (typeof usd === "number" && usd > 0) rates[code] = 1 / usd;
      }
    }
  } catch {
    // Fiat rates still work if CoinGecko is down.
  }
  usdRatesCache = { at: now, rates };
  return rates;
}

async function checkedRate(from: string, to: string, clientRate: number): Promise<number> {
  if (!Number.isFinite(clientRate) || clientRate <= 0) throw new Error("Invalid exchange rate");
  const rates = await usdPerUnitRates();
  const fromPerUsd = rates[from];
  const toPerUsd = rates[to];
  if (!fromPerUsd || !toPerUsd) {
    throw new Error(`No live rate for ${from} → ${to}`);
  }
  const live = toPerUsd / fromPerUsd;
  if (Math.abs(clientRate - live) / live > 0.08) {
    throw new Error("Exchange rate is out of date. Refresh and try again.");
  }
  return live;
}

async function liveUsdPrice(code: string, clientPrice: number): Promise<number> {
  const rates = await usdPerUnitRates();
  const perUsd = rates[code];
  if (!perUsd) throw new Error(`No live price for ${code}`);
  const live = 1 / perUsd;
  if (Math.abs(clientPrice - live) / live > 0.08) {
    throw new Error(`${code} price is out of date. Refresh and try again.`);
  }
  return live;
}

async function liveStockPrice(ticker: string, clientPrice: number): Promise<number> {
  const sym = ticker === "BRK.B" ? "BRK-B" : ticker;
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
    { headers: { "User-Agent": "Mozilla/5.0 ExoSky/1.0" } },
  );
  if (!res.ok) throw new Error("Could not load stock price");
  const data = await res.json();
  const live = Number(data?.chart?.result?.[0]?.meta?.regularMarketPrice);
  if (!Number.isFinite(live) || live <= 0) throw new Error(`No live price for ${ticker}`);
  if (Math.abs(clientPrice - live) / live > 0.08) {
    throw new Error(`${ticker} price is out of date. Refresh and try again.`);
  }
  return live;
}

async function upsertCryptoHolding(
  supabase: any,
  userId: string,
  code: string,
  amountDelta: number,
  price: number,
) {
  const { data: existing } = await supabase
    .from("crypto_holdings").select("*").eq("user_id", userId).eq("crypto_code", code).maybeSingle();

  if (existing) {
    const newAmount = existing.amount + amountDelta;
    if (newAmount <= 0.000001) {
      await supabase.from("crypto_holdings").delete().eq("id", existing.id);
    } else {
      const newAvg = amountDelta > 0
        ? (existing.avg_buy_price * existing.amount + price * amountDelta) / newAmount
        : existing.avg_buy_price;
      await supabase.from("crypto_holdings").update({ amount: newAmount, avg_buy_price: newAvg }).eq("id", existing.id);
    }
  } else if (amountDelta > 0) {
    await supabase.from("crypto_holdings").insert({
      user_id: userId, crypto_code: code, amount: amountDelta, avg_buy_price: price,
    });
  }
}

async function getCryptoHolding(supabase: any, userId: string, code: string): Promise<number> {
  const { data } = await supabase
    .from("crypto_holdings").select("amount").eq("user_id", userId).eq("crypto_code", code).maybeSingle();
  return data?.amount ?? 0;
}

async function upsertStockHolding(
  supabase: any,
  userId: string,
  ticker: string,
  sharesDelta: number,
  price: number,
) {
  const { data: existing } = await supabase
    .from("stock_holdings").select("*").eq("user_id", userId).eq("ticker", ticker).maybeSingle();

  if (existing) {
    const newShares = existing.shares + sharesDelta;
    if (newShares <= 0.0001) {
      await supabase.from("stock_holdings").delete().eq("id", existing.id);
    } else {
      const newAvg = sharesDelta > 0
        ? (existing.avg_buy_price * existing.shares + price * sharesDelta) / newShares
        : existing.avg_buy_price;
      await supabase.from("stock_holdings").update({ shares: newShares, avg_buy_price: newAvg }).eq("id", existing.id);
    }
  } else if (sharesDelta > 0) {
    await supabase.from("stock_holdings").insert({
      user_id: userId, ticker, shares: sharesDelta, avg_buy_price: price,
    });
  }
}

async function getStockShares(supabase: any, userId: string, ticker: string): Promise<number> {
  const { data } = await supabase
    .from("stock_holdings").select("shares").eq("user_id", userId).eq("ticker", ticker).maybeSingle();
  return data?.shares ?? 0;
}
