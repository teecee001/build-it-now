import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

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
    const pin = typeof body.pin === "string" ? body.pin : "";

    switch (operation) {
      case "send": {
        // Peer-to-peer send. The sender is ALWAYS the verified JWT user; any
        // user/sender id in the body is ignored. The whole transfer (debit,
        // credit, both ledger rows) runs inside one database function.
        const recipient = cleanRecipient(body.recipient);
        const idempotencyKey = cleanIdempotencyKey(body.idempotency_key);
        const currency = cleanCurrency(body.currency);
        const amount = roundMoney(finitePositive(body.amount, "amount"));
        const usdAmount = await usdEquivalent(currency, amount, body.usd_amount);
        await assertPin(supabase, userId, pin, usdAmount);
        const description = typeof body.description === "string"
          ? body.description.trim().slice(0, 300) || null
          : null;

        const transactionId = await p2pSend(supabase, {
          sender: userId, recipient, currency, amount, usdAmount, description, idempotencyKey,
        });
        return ok({ success: true, transaction_id: transactionId });
      }

      case "savings_transfer": {
        const amount = finitePositive(body.amount, "amount");
        await assertPin(supabase, userId, pin, amount);
        await callRpc(supabase, "savings_transfer", {
          p_user: userId,
          p_direction: body.direction,
          p_amount: amount,
        });
        return ok({ success: true });
      }

      case "crypto_trade": {
        const code = String(body.code || "");
        const action = String(body.action || "");
        const quoted = finitePositive(body.price, "price");
        if (!code) throw new Error("Invalid parameters");
        const price = await liveUsdPrice(code, quoted);
        const usd = action === "buy"
          ? finitePositive(body.amount, "amount")
          : finitePositive(body.amount, "amount") * price;
        await assertPin(supabase, userId, pin, usd);
        await callRpc(supabase, "crypto_trade", {
          p_user: userId,
          p_code: code,
          p_action: action,
          p_amount: finitePositive(body.amount, "amount"),
          p_price: price,
        });
        return ok({ success: true });
      }

      case "crypto_send": {
        throw new Error("On-chain withdrawals are not available. No coins were moved.");
      }

      case "crypto_swap": {
        const from = String(body.code || body.from || "");
        const to = String(body.swap_to || body.to || "");
        const units = finitePositive(body.amount, "amount");
        const fromPrice = await liveUsdPrice(from, finitePositive(body.price, "price"));
        const toPrice = await liveUsdPrice(to, finitePositive(body.swap_to_price, "swap price"));
        await assertPin(supabase, userId, pin, units * fromPrice);
        const received = await callRpc(supabase, "crypto_swap", {
          p_user: userId,
          p_from: from,
          p_to: to,
          p_units: units,
          p_from_price: fromPrice,
          p_to_price: toPrice,
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
        await assertPin(supabase, userId, pin, shares * price);
        await callRpc(supabase, "stock_trade", {
          p_user: userId,
          p_ticker: ticker,
          p_action: action,
          p_shares: shares,
          p_price: price,
        });
        return ok({ success: true });
      }

      case "demo_deposit": {
        throw new Error("Deposits are not available yet. No money was added.");
      }

      case "bill_pay": {
        const amount = finitePositive(body.amount, "amount");
        await assertPin(supabase, userId, pin, amount);
        const cashback = await callRpc(supabase, "bill_pay", {
          p_user: userId,
          p_amount: amount,
          p_name: String(body.biller_name || "bill"),
        });
        return ok({ success: true, cashback });
      }

      case "qr_pay": {
        const amount = roundMoney(finitePositive(body.amount, "amount"));
        await assertPin(supabase, userId, pin, amount);
        const recipient = cleanRecipient(body.recipient);
        const idempotencyKey = cleanIdempotencyKey(body.idempotency_key);
        const note = String(body.note || "").slice(0, 140);
        const transactionId = await p2pSend(supabase, {
          sender: userId, recipient, currency: "USD", amount, usdAmount: amount,
          description: `QR Payment to ${recipient}${note ? ` — ${note}` : ""}`,
          idempotencyKey,
        });
        return ok({ success: true, transaction_id: transactionId });
      }

      case "convert": {
        const { from_currency, to_currency } = body;
        const amount = Number(body.amount);
        const rate = await checkedRate(String(from_currency), String(to_currency), Number(body.rate));
        if (!from_currency || !to_currency) throw new Error("Missing from/to currency");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");
        const from = String(from_currency).toUpperCase();
        const rates = await usdPerUnitRates();
        const perUsd = from === "USD" ? 1 : rates[from];
        const usd = perUsd && perUsd > 0 ? amount / perUsd : amount;
        await assertPin(supabase, userId, pin, usd);
        const convertedAmount = await callRpc(supabase, "convert_funds", {
          p_user: userId,
          p_from: from_currency,
          p_to: to_currency,
          p_amount: amount,
          p_rate: rate,
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

function roundMoney(n: number): number {
  const r = Math.round(n * 1e8) / 1e8;
  if (!Number.isFinite(r) || r <= 0) throw new Error("Invalid amount");
  return r;
}

function cleanRecipient(value: unknown): string {
  const r = typeof value === "string" ? value.trim() : "";
  if (!r) throw new Error("Recipient is required");
  if (r.length > 254) throw new Error("Recipient is too long");
  return r;
}

function cleanIdempotencyKey(value: unknown): string {
  const k = typeof value === "string" ? value.trim() : "";
  if (!k || k.length > 128) throw new Error("Missing idempotency key. Please refresh the page and try again.");
  return k;
}

function cleanCurrency(value: unknown): string {
  const c = String(value ?? "USD").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,10}$/.test(c)) throw new Error("Invalid currency");
  return c;
}

// USD value recorded on the ledger rows. Computed from live rates; the client's
// number is only a fallback if rates are unavailable (display only, it never
// affects the wallet balances, which move in the wallet's own currency).
async function usdEquivalent(currency: string, amount: number, clientUsd: unknown): Promise<number> {
  if (currency === "USD") return amount;
  try {
    const rates = await usdPerUnitRates();
    const perUsd = rates[currency];
    if (perUsd && perUsd > 0) return roundMoney(amount / perUsd);
  } catch {
    // fall through to the client value
  }
  const fallback = Number(clientUsd);
  if (Number.isFinite(fallback) && fallback > 0) return roundMoney(fallback);
  throw new Error(`No live rate for ${currency}. Try again in a moment.`);
}

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
};

// Error codes raised by public.p2p_send whose message is safe and useful to show.
const P2P_USER_ERROR_CODES = new Set(["22023", "P0002", "23514"]);


async function assertPin(supabase: SupabaseClient, userId: string, pin: string, usd: number) {
  if (!(usd > 500)) return;
  await callRpc(supabase, "assert_tx_pin", { p_user: userId, p_pin: pin, p_usd: usd });
}

async function callRpc(supabase: SupabaseClient, fn: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const message = error.message ?? "Operation failed";
    console.error(fn, error.code, message);
    if (error.code && (P2P_USER_ERROR_CODES.has(error.code) || error.code === "22023" || error.code === "23514" || error.code === "P0002" || error.code === "28000")) {
      throw new Error(message);
    }
    if (/insufficient|invalid|wallet|pin|not available|not found|already|upgrade|currency/i.test(message)) {
      throw new Error(message.replace(/^.*ERROR:\s*/i, ""));
    }
    throw new Error("Operation failed. No money was moved. Please try again.");
  }
  return data;
}

async function p2pSend(
  client: unknown,
  t: {
    sender: string;
    recipient: string;
    currency: string;
    amount: number;
    usdAmount: number;
    description: string | null;
    idempotencyKey: string;
  },
): Promise<string> {
  const supabase = client as RpcClient;
  const { data, error } = await supabase.rpc("p2p_send", {
    p_sender: t.sender,
    p_recipient: t.recipient,
    p_currency: t.currency,
    p_amount: t.amount,
    p_usd_amount: t.usdAmount,
    p_description: t.description,
    p_idempotency_key: t.idempotencyKey,
  });
  if (error) {
    if (error.code && P2P_USER_ERROR_CODES.has(error.code)) throw new Error(error.message ?? "Transfer failed");
    console.error("p2p_send failed", error.code, error.message);
    if (error.code === "PGRST202" || /could not find the function/i.test(error.message ?? "")) {
      // Migration not applied yet: nothing was moved.
      throw new Error("Transfers are temporarily unavailable. No money was moved. Please try again later.");
    }
    throw new Error("Transfer failed. No money was moved. Please try again.");
  }
  if (typeof data !== "string" || !data) {
    console.error("p2p_send returned no transaction id", data);
    throw new Error("Transfer could not be confirmed. Please check your activity before retrying.");
  }
  return data;
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
  TRX: "tron", DOT: "polkadot", MATIC: "polygon-ecosystem-token", LTC: "litecoin",
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
