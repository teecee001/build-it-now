import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ADVISOR_SYSTEM, chatCompletions, getAdvisorAiConfig } from "../_shared/ai.ts";
import { type AccountData, type Quote, accountSummary, ruleAnswer } from "./rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-exo-source",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Emit a complete answer in the same OpenAI-style SSE format the client already parses. */
function sseAnswer(text: string): Response {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(c) {
      for (const piece of text.match(/[^\n]*\n?/g) ?? [text]) {
        if (!piece) continue;
        c.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: piece } }] })}\n\n`));
      }
      c.enqueue(enc.encode("data: [DONE]\n\n"));
      c.close();
    },
  });
  return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Exo-Source": "built-in" } });
}

async function fetchQuotes(cls: "crypto" | "stocks"): Promise<Record<string, Quote>> {
  try {
    const base = Deno.env.get("SUPABASE_URL") ?? "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${base}/functions/v1/market-data?class=${cls}`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return {};
    const body = await res.json();
    const map = (body?.[cls] ?? {}) as Record<string, Quote>;
    const out: Record<string, Quote> = {};
    for (const [k, v] of Object.entries(map)) {
      if (v && Number(v.price) > 0) out[k] = { price: Number(v.price), changePct: Number(v.changePct) || 0 };
    }
    return out;
  } catch {
    return {};
  }
}

/** Reads only the signed-in user's rows, using their own JWT so RLS applies (never the service role). */
async function loadAccount(token: string, userId: string, fallbackName?: string): Promise<AccountData> {
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const [profile, wallets, txns, bills, crypto, stocks, cryptoQuotes, stockQuotes] = await Promise.all([
    db.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    db.from("wallets").select("currency, balance, savings_balance").eq("user_id", userId),
    db.from("transactions").select("amount, currency, type, status, description, recipient, created_at, metadata")
      .eq("user_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(200),
    db.from("bills").select("biller_name, amount, category, due_date, is_paid").eq("user_id", userId),
    db.from("crypto_holdings").select("crypto_code, amount").eq("user_id", userId),
    db.from("stock_holdings").select("ticker, shares").eq("user_id", userId),
    fetchQuotes("crypto"),
    fetchQuotes("stocks"),
  ]);
  return {
    name: profile.data?.full_name ?? fallbackName ?? null,
    wallets: (wallets.data ?? []).map((w) => ({ currency: w.currency, balance: Number(w.balance), savings_balance: Number(w.savings_balance) })),
    transactions: (txns.data ?? []) as AccountData["transactions"],
    bills: (bills.data ?? []).map((b) => ({ ...b, amount: Number(b.amount) })),
    crypto: (crypto.data ?? []).map((h) => ({ code: h.crypto_code, amount: Number(h.amount) })),
    stocks: (stocks.data ?? []).map((h) => ({ code: h.ticker, amount: Number(h.shares) })),
    cryptoQuotes,
    stockQuotes,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    // Unchanged: this client only verifies the caller's JWT.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false } },
    );
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) return json({ error: "Sign in required" }, 401);

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length > 40) return json({ error: "Invalid messages" }, 400);

    const lastUser = [...messages].reverse().find((m) => m?.role === "user");
    const question = typeof lastUser?.content === "string" ? lastUser.content.slice(0, 2000) : "";

    const account = await loadAccount(
      token,
      userData.user.id,
      (userData.user.user_metadata?.full_name as string | undefined) ?? undefined,
    );
    const builtIn = () => sseAnswer(ruleAnswer(question, account));

    const cfg = getAdvisorAiConfig();
    if (!cfg) return builtIn();

    try {
      const response = await chatCompletions(cfg, {
        messages: [
          { role: "system", content: ADVISOR_SYSTEM },
          {
            role: "system",
            content:
              `Signed-in user's account summary. Use it for personalised answers, never invent numbers, never promise returns:\n${accountSummary(account)}`,
          },
          ...messages.slice(-20),
        ],
        stream: true,
      });
      if (!response.ok || !response.body) {
        console.error("AI provider error, using built-in advisor:", response.status, await response.text().catch(() => ""));
        return builtIn();
      }
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Exo-Source": "ai" },
      });
    } catch (e) {
      console.error("AI provider failed, using built-in advisor:", e);
      return builtIn();
    }
  } catch (e) {
    console.error("ai-advisor error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
