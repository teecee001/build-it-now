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
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate
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
          .from("wallets").select("*").eq("id", wallet_id).eq("user_id", userId).single();
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
          .from("wallets").select("*").eq("user_id", userId).eq("currency", "USD").single();
        if (wErr || !wallet) throw new Error("USD wallet not found");

        if (direction === "to_savings") {
          if (wallet.balance < amount) throw new Error("Insufficient wallet balance");
          await supabase.from("wallets").update({
            balance: wallet.balance - amount,
            savings_balance: wallet.savings_balance + amount,
          }).eq("id", wallet.id);
          await supabase.from("transactions").insert({
            user_id: userId, type: "deposit", amount: -amount,
            description: `Transfer to Savings — 6.0% APY`, status: "completed",
            metadata: { savings_transfer: true, direction: "to_savings" },
          });
        } else if (direction === "to_wallet") {
          if (wallet.savings_balance < amount) throw new Error("Insufficient savings balance");
          await supabase.from("wallets").update({
            balance: wallet.balance + amount,
            savings_balance: wallet.savings_balance - amount,
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
        const { action, code, amount: tradeAmount, price, crypto_amount, usd_value } = body;
        if (!code || !tradeAmount || tradeAmount <= 0 || !price) throw new Error("Invalid parameters");

        const { data: usdWallet, error: wErr } = await supabase
          .from("wallets").select("*").eq("user_id", userId).eq("currency", "USD").single();
        if (wErr || !usdWallet) throw new Error("No USD wallet");

        if (action === "buy") {
          if (usdWallet.balance < tradeAmount) throw new Error("Insufficient USD balance");
          await supabase.from("wallets").update({ balance: usdWallet.balance - tradeAmount }).eq("id", usdWallet.id);
          // Upsert crypto holding
          await upsertCryptoHolding(supabase, userId, code, crypto_amount, price);
          await supabase.from("transactions").insert({
            user_id: userId, type: "purchase", amount: -tradeAmount, status: "completed",
            description: `Bought ${crypto_amount.toFixed(6)} ${code} at $${price.toLocaleString()}`,
            metadata: { crypto: code, crypto_amount, price_per_unit: price, action: "buy" },
          });
        } else if (action === "sell") {
          const holding = await getCryptoHolding(supabase, userId, code);
          if (holding < tradeAmount) throw new Error(`Insufficient ${code} balance`);
          await supabase.from("wallets").update({ balance: usdWallet.balance + usd_value }).eq("id", usdWallet.id);
          await upsertCryptoHolding(supabase, userId, code, -tradeAmount, price);
          await supabase.from("transactions").insert({
            user_id: userId, type: "purchase", amount: usd_value, status: "completed",
            description: `Sold ${tradeAmount.toFixed(6)} ${code} at $${price.toLocaleString()}`,
            metadata: { crypto: code, crypto_amount: tradeAmount, price_per_unit: price, action: "sell" },
          });
        } else {
          throw new Error("Invalid action");
        }
        return ok({ success: true });
      }

      case "stock_trade": {
        const { action, ticker, shares, dollar_value, price } = body;
        if (!ticker || !shares || shares <= 0 || !price) throw new Error("Invalid parameters");

        const { data: usdWallet, error: wErr } = await supabase
          .from("wallets").select("*").eq("user_id", userId).eq("currency", "USD").single();
        if (wErr || !usdWallet) throw new Error("No USD wallet");

        if (action === "buy") {
          if (usdWallet.balance < dollar_value) throw new Error("Insufficient USD balance");
          await supabase.from("wallets").update({ balance: usdWallet.balance - dollar_value }).eq("id", usdWallet.id);
          await upsertStockHolding(supabase, userId, ticker, shares, price);
          await supabase.from("transactions").insert({
            user_id: userId, type: "purchase", amount: -dollar_value, status: "completed",
            description: `Bought ${shares.toFixed(4)} shares of ${ticker} at $${price.toFixed(2)}`,
            metadata: { stock: ticker, shares, price_per_share: price, action: "stock_buy" },
          });
        } else if (action === "sell") {
          const currentShares = await getStockShares(supabase, userId, ticker);
          if (currentShares < shares) throw new Error(`Insufficient ${ticker} shares`);
          await supabase.from("wallets").update({ balance: usdWallet.balance + dollar_value }).eq("id", usdWallet.id);
          await upsertStockHolding(supabase, userId, ticker, -shares, price);
          await supabase.from("transactions").insert({
            user_id: userId, type: "purchase", amount: dollar_value, status: "completed",
            description: `Sold ${shares.toFixed(4)} shares of ${ticker} at $${price.toFixed(2)}`,
            metadata: { stock: ticker, shares, price_per_share: price, action: "stock_sell" },
          });
        } else {
          throw new Error("Invalid action");
        }
        return ok({ success: true });
      }

      case "convert": {
        const { from_currency, to_currency, amount, rate } = body;
        if (!from_currency || !to_currency || !amount || amount <= 0 || !rate) throw new Error("Invalid parameters");

        const { data: fromWallet, error: fErr } = await supabase
          .from("wallets").select("*").eq("user_id", userId).eq("currency", from_currency).single();
        if (fErr || !fromWallet) throw new Error(`No ${from_currency} wallet`);
        if (fromWallet.balance < amount) throw new Error(`Insufficient ${from_currency} balance`);

        // Get or create destination wallet
        let { data: toWallet } = await supabase
          .from("wallets").select("*").eq("user_id", userId).eq("currency", to_currency).single();

        if (!toWallet) {
          const { data: newWallet, error: cErr } = await supabase
            .from("wallets").insert({ user_id: userId, balance: 0, savings_balance: 0, currency: to_currency })
            .select().single();
          if (cErr) throw cErr;
          toWallet = newWallet;
        }

        const convertedAmount = amount * rate;

        await supabase.from("wallets").update({ balance: fromWallet.balance - amount }).eq("id", fromWallet.id);
        await supabase.from("wallets").update({ balance: toWallet.balance + convertedAmount }).eq("id", toWallet.id);

        await supabase.from("transactions").insert({
          user_id: userId, type: "conversion", amount: -Math.abs(amount), status: "completed",
          description: `Converted ${amount.toFixed(2)} ${from_currency} → ${convertedAmount.toFixed(4)} ${to_currency}`,
          metadata: { from: from_currency, to: to_currency, from_amount: amount, to_amount: convertedAmount, rate },
        });

        return ok({ success: true, convertedAmount });
      }

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
  });
}

async function upsertCryptoHolding(supabase: any, userId: string, code: string, amountDelta: number, price: number) {
  const { data: existing } = await supabase
    .from("crypto_holdings").select("*").eq("user_id", userId).eq("crypto_code", code).single();

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
    .from("crypto_holdings").select("amount").eq("user_id", userId).eq("crypto_code", code).single();
  return data?.amount ?? 0;
}

async function upsertStockHolding(supabase: any, userId: string, ticker: string, sharesDelta: number, price: number) {
  const { data: existing } = await supabase
    .from("stock_holdings").select("*").eq("user_id", userId).eq("ticker", ticker).single();

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
    .from("stock_holdings").select("shares").eq("user_id", userId).eq("ticker", ticker).single();
  return data?.shares ?? 0;
}
