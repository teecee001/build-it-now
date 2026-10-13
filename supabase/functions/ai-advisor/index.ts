import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ADVISOR_SYSTEM, chatCompletions, getAdvisorProviders } from "../_shared/ai.ts";
import { type AccountData, type Quote, accountSummary, detectIntent, ruleAnswer, safeTimeZone, todayISO, todayText } from "./rules.ts";
import { type CallResult, runAgent } from "./agent.ts";
import type { GoalsDb } from "./tools.ts";

// Exo-internal system instructions (not app UI copy).
const EXO_DATA_RULES = [
  "Account data (balances, transactions, bills, savings, holdings, prices, goals) comes from ExoSky's records through your tools and the account summary, NOT from the user.",
  'Never say "you mentioned", "you said" or "you told me" about account data; say "your account shows" instead.',
  "Get figures by calling tools. Use the calculate tool for every calculation (interest, projections, budgets, conversions, totals); never do arithmetic yourself.",
  "Only state dollar amounts and percentages that come from tool results or the account summary.",
  "Only call set_goal when the user explicitly asks to save a goal.",
].join("\n");
const todayLine = (a: AccountData) =>
  `Today's date is ${todayText(a.now ?? new Date(), a.timeZone ?? "UTC")} (${todayISO(a.now ?? new Date(), a.timeZone ?? "UTC")}, user's time zone ${
    a.timeZone ?? "UTC"
  }). This is authoritative and overrides your training data. Resolve relative dates like "by December 31" to the next such date, never one in the past.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-exo-source, x-exo-provider, x-exo-tried, x-exo-tools, x-exo-mode, x-exo-factcheck",
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Emit a complete answer in the same OpenAI-style SSE format the client already parses. */
function sseAnswer(text: string, extra: Record<string, string> = {}): Response {
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
  return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Exo-Source": "built-in", ...extra } });
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
async function loadAccount(token: string, userId: string, fallbackName?: string): Promise<{ account: AccountData; goals?: GoalsDb }> {
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const [profile, wallets, txns, bills, crypto, stocks, cryptoQuotes, stockQuotes, goalsProbe] = await Promise.all([
    db.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    db.from("wallets").select("currency, balance, savings_balance").eq("user_id", userId),
    db.from("transactions").select("amount, currency, type, status, description, recipient, created_at, metadata")
      .eq("user_id", userId).gte("created_at", since).order("created_at", { ascending: false }).limit(200),
    db.from("bills").select("biller_name, amount, category, due_date, is_paid").eq("user_id", userId),
    db.from("crypto_holdings").select("crypto_code, amount").eq("user_id", userId),
    db.from("stock_holdings").select("ticker, shares").eq("user_id", userId),
    fetchQuotes("crypto"),
    fetchQuotes("stocks"),
    // Goal memory is optional: skipped gracefully until the exo_goals migration is applied.
    db.from("exo_goals").select("id").limit(1),
  ]);
  const goals: GoalsDb | undefined = goalsProbe.error ? undefined : {
    list: async () => await db.from("exo_goals").select("goal, target_amount, target_date, created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(20),
    insert: async (row) => await db.from("exo_goals").insert({ ...row, user_id: userId }).select("goal, target_amount, target_date").single(),
  };
  const account: AccountData = {
    name: profile.data?.full_name ?? fallbackName ?? null,
    wallets: (wallets.data ?? []).map((w) => ({ currency: w.currency, balance: Number(w.balance), savings_balance: Number(w.savings_balance) })),
    transactions: (txns.data ?? []) as AccountData["transactions"],
    bills: (bills.data ?? []).map((b) => ({ ...b, amount: Number(b.amount) })),
    crypto: (crypto.data ?? []).map((h) => ({ code: h.crypto_code, amount: Number(h.amount) })),
    stocks: (stocks.data ?? []).map((h) => ({ code: h.ticker, amount: Number(h.shares) })),
    cryptoQuotes,
    stockQuotes,
  };
  return { account, goals };
}

async function fiatRates(): Promise<Record<string, number>> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) return {};
  return ((await res.json())?.rates ?? {}) as Record<string, number>;
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

    const { messages, timezone } = await req.json();
    if (!Array.isArray(messages) || messages.length > 40) return json({ error: "Invalid messages" }, 400);

    const lastUser = [...messages].reverse().find((m) => m?.role === "user");
    const question = typeof lastUser?.content === "string" ? lastUser.content.slice(0, 2000) : "";

    const { account, goals } = await loadAccount(
      token,
      userData.user.id,
      (userData.user.user_metadata?.full_name as string | undefined) ?? undefined,
    );
    account.now = new Date();
    account.timeZone = safeTimeZone(timezone);
    const builtIn = (extra: Record<string, string> = {}) => sseAnswer(ruleAnswer(question, account), extra);

    // Date questions are answered exactly from the server clock in the user's time zone.
    if (detectIntent(question) === "date") {
      return builtIn({ "X-Exo-Provider": "built-in", "X-Exo-Tried": "date-shortcut", "X-Exo-Tools": "none", "X-Exo-Factcheck": "pass" });
    }

    const providers = getAdvisorProviders();
    const tried: string[] = [];
    const summary = accountSummary(account);
    const baseMessages = [
      { role: "system", content: todayLine(account) },
      { role: "system", content: ADVISOR_SYSTEM },
      { role: "system", content: EXO_DATA_RULES },
      {
        role: "system",
        content:
          `Account summary from ExoSky's records (not from the user). Use it for personalised answers, never invent numbers, never promise returns:\n${summary}`,
      },
      ...messages.slice(-20),
    ];
    const userText = messages.filter((m) => m?.role === "user" && typeof m.content === "string").map((m) => m.content as string);

    for (const p of providers) {
      const call = async (b: Record<string, unknown>): Promise<CallResult> => {
        const send = () => chatCompletions(p, { ...b, ...(p.extraBody ?? {}) });
        let response = await send();
        if (response.status === 503 || response.status === 429) {
          // Transient overload / rate limit: one short retry before giving up on this provider.
          await response.body?.cancel().catch(() => {});
          tried.push(`${p.name}=${response.status}`);
          await new Promise((r) => setTimeout(r, 700));
          response = await send();
        }
        if (response.ok) return { ok: true, status: response.status, json: await response.json() };
        const text = (await response.text().catch(() => "")).split(p.apiKey).join("[redacted]")
          .replace(/\b(sk|gsk|xai|AIza)[-_A-Za-z0-9*.]{6,}/g, "[redacted]")
          .replace(/\s+/g, " ").slice(0, 300);
        console.error(`Exo provider ${p.name} failed: HTTP ${response.status} ${text.slice(0, 200)}`);
        return { ok: false, status: response.status, text };
      };
      try {
        const result = await runAgent({
          call,
          messages: baseMessages,
          ctx: { account, goals, fiatRates },
          evidence: [summary, ...userText],
        });
        if (result.kind === "http_error") {
          tried.push(`${p.name}=${result.status}`);
          continue;
        }
        tried.push(`${p.name}=200`);
        const meta = {
          "X-Exo-Provider": p.name,
          "X-Exo-Tried": tried.join(","),
          "X-Exo-Tools": result.toolsUsed.join(",") || "none",
          "X-Exo-Mode": result.mode,
        };
        if (result.kind === "factcheck_failed") {
          console.error(`Exo fact-check failed on ${p.name}: unsupported ${result.unsupported.join(", ").slice(0, 200)}`);
          return builtIn({ ...meta, "X-Exo-Factcheck": "failed-built-in" });
        }
        return sseAnswer(result.text, { ...meta, "X-Exo-Source": "ai", "X-Exo-Factcheck": result.factcheck });
      } catch (e) {
        console.error(`Exo provider ${p.name} threw: ${e instanceof Error ? e.name + ": " + e.message.slice(0, 200) : "unknown"}`);
        tried.push(`${p.name}=error`);
      }
    }
    return builtIn({ "X-Exo-Provider": "built-in", "X-Exo-Tried": tried.length ? tried.join(",") : "none-configured" });
  } catch (e) {
    console.error("ai-advisor error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
