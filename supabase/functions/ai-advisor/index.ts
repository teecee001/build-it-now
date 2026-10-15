import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ADVISOR_SYSTEM, chatCompletions, getAdvisorProviders } from "../_shared/ai.ts";
import { type AccountData, type Quote, accountSummary, detectIntent, ruleAnswer, safeTimeZone, todayISO, todayText } from "./rules.ts";
import { type CallResult, runAgent } from "./agent.ts";
import type { GoalsDb } from "./tools.ts";
import { sanitizeMessages } from "./history.ts";
import { appendSources, collectHeadlines } from "./sources.ts";
import { AGENTS, agentSystem, Blackboard, LIFE_RULES, leadSynthesis, type Mode, route, STYLE_RULES } from "./orchestrator.ts";

// Exo-internal system instructions (not app UI copy).
const EXO_DATA_RULES = [
  "Account data (balances, transactions, bills, savings, holdings, prices, goals) comes from ExoSky's records through your tools and the account summary, NOT from the user.",
  'Never say "you mentioned", "you said" or "you told me" about account data; say "your account shows" instead.',
  "Get figures by calling tools. Use the calculate tool for every calculation (interest, projections, budgets, conversions, totals, and days between dates via op days_until); never do arithmetic yourself.",
  "Only state dollar amounts and percentages that come from tool results or the account summary.",
  "You are Exo: an expert financial advisor, auditor, accountant and markets analyst. You HAVE live data tools: get_news (live headlines), get_market_sentiment (crypto and stock Fear & Greed), get_macro (fed funds, Treasury yields, CPI inflation, unemployment, mortgage rates), get_company_fundamentals (SEC filings) and audit_finances (statements, subscriptions, anomalies, savings rate). Never say you lack news, browsing, internet or real-time access; call the tool instead.",
  "For any news, Fed, rate-cut, inflation, economy, market, company or crypto question, call get_news (and get_macro / get_market_sentiment where relevant) before answering. Cite each headline's source and date. Note that headlines are not confirmed outcomes.",
  "For audits, budgets, statements, subscriptions or 'where does my money go' questions, call audit_finances and present it like an accountant: statement, findings, then concrete recommendations.",
  "For company analysis, call get_company_fundamentals and get_prices, and say which period each figure is for. If a tool returns an error, say that source is temporarily unavailable and use the others.",
  "When reporting news, list the key headlines as bullets ending with the source and date in parentheses, e.g. (Reuters, Oct 7), then give your analysis.",
  "Keep the not-financial-advice caveat for investment suggestions.",
  "Only call set_goal when the user explicitly asks to save a goal. Only call delete_goal when the user explicitly asks to remove a goal; call list_goals first to get its id, and never delete goals the user didn't ask to remove.",
].join("\n");
const todayLine = (a: AccountData) =>
  `Today's date is ${todayText(a.now ?? new Date(), a.timeZone ?? "UTC")} (${todayISO(a.now ?? new Date(), a.timeZone ?? "UTC")}, user's time zone ${
    a.timeZone ?? "UTC"
  }). This is authoritative and overrides your training data. Resolve relative dates like "by December 31" to the next such date, never one in the past.`;

const TIME_BUDGET_MS = 40_000;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Expose-Headers": "x-exo-source, x-exo-provider, x-exo-tried, x-exo-tools, x-exo-mode, x-exo-factcheck, x-exo-agents, x-exo-cache-hits",
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
    list: async () => await db.from("exo_goals").select("id, goal, target_amount, target_date, created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(20),
    insert: async (row) => await db.from("exo_goals").insert({ ...row, user_id: userId }).select("id, goal, target_amount, target_date").single(),
    // RLS restricts deletes to the owner; the user_id filter is a second guard.
    remove: async (id) => await db.from("exo_goals").delete().eq("id", id).eq("user_id", userId).select("id"),
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

    const body = await req.json().catch(() => ({}));
    const timezone = body?.timezone;
    // Optional; older clients don't send it and get Money mode (unchanged behaviour).
    const mode: Mode = body?.mode === "life" ? "life" : "money";
    if (!Array.isArray(body?.messages)) return json({ error: "Invalid messages" }, 400);
    // The app keeps up to 200 messages of history and sends them all; never reject a long
    // chat (that surfaced as the client's generic error). Keep only the recent, valid turns.
    const messages = sanitizeMessages(body.messages);
    if (!messages.length) return json({ error: "Invalid messages" }, 400);

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
    if (mode === "money" && detectIntent(question) === "date") {
      return builtIn({ "X-Exo-Provider": "built-in", "X-Exo-Tried": "date-shortcut", "X-Exo-Tools": "none", "X-Exo-Factcheck": "pass" });
    }

    const providers = getAdvisorProviders();
    const started = Date.now();
    const tried: string[] = [];
    const summary = accountSummary(account);
    const baseMessages = [
      { role: "system", content: todayLine(account) },
      { role: "system", content: ADVISOR_SYSTEM },
      { role: "system", content: EXO_DATA_RULES },
      { role: "system", content: STYLE_RULES },
      ...(mode === "life" ? [{ role: "system", content: LIFE_RULES }] : []),
      {
        role: "system",
        content:
          `Account summary from ExoSky's records (not from the user). Use it for personalised answers, never invent numbers, never promise returns:\n${summary}`,
      },
      ...messages,
    ];
    const plan = route(question, mode);
    const board = new Blackboard();
    const allowFor = (ids: typeof plan.agents) => [...new Set(ids.flatMap((id) => AGENTS[id].tools))];
    const userText = messages.filter((m) => m?.role === "user" && typeof m.content === "string").map((m) => m.content as string);

    const leadNews: unknown[] = [];
    for (const p of providers) {
      // Per-request time budget: stay well inside the edge wall-clock limit and the user's patience.
      if (Date.now() - started > TIME_BUDGET_MS) {
        tried.push(`${p.name}=skipped-time-budget`);
        continue;
      }
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
        const deadline = started + TIME_BUDGET_MS;
        const evidence = [summary, ...userText];
        const persona = (ids: typeof plan.agents) => ({ role: "system", content: ids.map(agentSystem).join("\n") });
        let leadMessages = [...baseMessages.slice(0, -messages.length), persona(plan.agents), ...messages];
        if (plan.debate) {
          // Bull and Bear research in parallel on the shared blackboard; the Lead then synthesises.
          const sides = await Promise.all((["bull", "bear"] as const).map(async (id) => {
            const r = await runAgent({
              call, deadline: Math.min(deadline, Date.now() + 18_000), evidence: [...evidence],
              messages: [...baseMessages.slice(0, -messages.length), persona([id]), ...messages],
              ctx: { account, goals, fiatRates, allow: AGENTS[id].tools, board },
            }).catch(() => null);
            return r && r.kind === "answer" ? { agent: AGENTS[id].name, text: r.text, used: r.toolsUsed, news: r.newsResults ?? [] } : null;
          }));
          for (const f of sides) if (f) { board.findings.push({ agent: f.agent, text: f.text }); evidence.push(f.text); }
          if (board.findings.length) leadMessages = [...baseMessages.slice(0, -messages.length), { role: "system", content: leadSynthesis(board.findings) }, ...messages];
          sides.forEach((f) => f && f.news.length && (leadNews.push(...f.news)));
        }
        const result = await runAgent({
          call,
          messages: leadMessages,
          deadline,
          ctx: { account, goals, fiatRates, allow: allowFor(plan.agents.filter((a) => !plan.debate || (a !== "bull" && a !== "bear")).concat(plan.debate ? ["wealth"] : [])), board },
          evidence,
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
          "X-Exo-Mode": `${mode}/${result.mode}`,
          "X-Exo-Agents": plan.agents.join(",") + (plan.debate ? "+lead" : ""),
          "X-Exo-Cache-Hits": String(board.hits),
        };
        if (result.kind === "factcheck_failed") {
          console.error(`Exo fact-check failed on ${p.name}: unsupported ${result.unsupported.join(", ").slice(0, 200)}`);
          return builtIn({ ...meta, "X-Exo-Factcheck": "failed-built-in" });
        }
        const text = appendSources(result.text, collectHeadlines([...leadNews, ...(result.newsResults ?? [])]));
        return sseAnswer(text, { ...meta, "X-Exo-Source": "ai", "X-Exo-Factcheck": result.factcheck });
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
