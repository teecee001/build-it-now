// Exo server-side tools. Account reads come from data already loaded through the
// user's own RLS client; goals go through that same client. No service role here.
import { auditFinances } from "./audit.ts";
import { getCompanyFundamentals, getMacro, getMarketSentiment, getNews } from "./live.ts";
import { type AccountData, APY_RATE, projectSavings, spendingByCategory, todayISO } from "./rules.ts";
import { blackScholes, meanVariance, missing, monteCarlo } from "./quant.ts";
import { balanceSheet, checkBooks, selfCorrect } from "./accounting.ts";
import { mapsLink, planEvent, planTrip, shopSearch } from "./life.ts";
import type { Blackboard } from "./orchestrator.ts";
import { type AssetClass, clampParams, DEFAULT_LIMITS, DEFAULT_TARGETS, governor, type Limits, macroPosture, type Position, PRIVATE_EQUITY_STUB, quantSignal, type Targets } from "./engines.ts";

export type GoalsDb = {
  remove(id: string): Promise<{ data: unknown[] | null; error: { code?: string; message?: string } | null }>;
  list(): Promise<{ data: unknown[] | null; error: { code?: string; message?: string } | null }>;
  insert(row: { goal: string; target_amount: number | null; target_date: string | null }): Promise<
    { data: unknown | null; error: { code?: string; message?: string } | null }
  >;
};

export type ToolCtx = {
  account: AccountData;
  goals?: GoalsDb; // undefined when the exo_goals table doesn't exist
  fiatRates?: () => Promise<Record<string, number>>; // units per 1 USD
  allow?: string[]; // tool subset for a specialist agent
  board?: Blackboard; // shared per-request memory
  risk?: { limits: Limits; targets: Targets; backend: string }; // shared targets/limits (Redis or memory)
};

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});

export function toolDefs(withGoals: boolean, allow?: string[]) {
  const all = baseDefs(withGoals);
  return allow ? all.filter((d) => allow.includes(d.function.name)) : all;
}

function baseDefs(withGoals: boolean) {
  const defs = [
    fn("get_balances", "Wallet balances (available and savings) for each currency, plus crypto/stock holdings valued at live prices.", {}),
    fn("get_transactions", "The user's transactions from their account.", {
      range_days: { type: "integer", description: "Look-back window in days (1-90). Default 30." },
      category: { type: "string", description: "Optional category or type filter, e.g. Dining, Bills, send." },
    }),
    fn("get_bills", "The user's bills with amount, due date and paid status.", {}),
    fn("get_savings", `Savings balance and an illustrative ${APY_RATE}% chart rate. Interest is not paid.`, {}),
    fn("get_prices", "Live USD prices and 24h change for crypto or stock symbols.", {
      symbols: { type: "array", items: { type: "string" }, description: "e.g. [\"BTC\",\"ETH\",\"NVDA\"]" },
    }, ["symbols"]),
    fn("calculate", "Exact maths done in code. Always use this instead of doing arithmetic yourself.", {
      op: {
        type: "string",
        enum: ["compound_savings", "monthly_needed", "budget_50_30_20", "convert", "arithmetic", "days_until"],
        description:
          "compound_savings(principal, monthly, years, apy?) | monthly_needed(target, months, principal?, apy?) | budget_50_30_20(income) | convert(amount, from, to) | arithmetic(expression with + - * / ( ) and numbers) | days_until(date YYYY-MM-DD or MM-DD; a past date rolls to its next occurrence)",
      },
      principal: { type: "number" },
      monthly: { type: "number" },
      years: { type: "number" },
      months: { type: "number" },
      target: { type: "number" },
      apy: { type: "number", description: `Chart rate only. Defaults to ${APY_RATE}%. Interest is not paid.` },
      income: { type: "number" },
      amount: { type: "number" },
      from: { type: "string" },
      to: { type: "string" },
      expression: { type: "string" },
      date: { type: "string", description: "For days_until: YYYY-MM-DD or MM-DD" },
    }, ["op"]),
    fn("get_news", "Live news headlines (Google News, last 7 days) with source, date and link. Use for any news, markets, macro, Fed/rate-cut, economy, company or crypto question.", {
      query: { type: "string", description: "Search terms, e.g. \"Fed rate cut\", \"NVIDIA earnings\", \"bitcoin ETF\"" },
      limit: { type: "integer", description: "Headlines to return (1-15). Default 8." },
    }, ["query"]),
    fn("get_market_sentiment", "Live Fear & Greed indexes: crypto (alternative.me) and US stocks (CNN), with prior values.", {}),
    fn("get_company_fundamentals", "Official SEC EDGAR filing data for a US-listed company: revenue, net income, diluted EPS, operating income (latest years and quarters), cash, long-term debt, assets, liabilities, shares outstanding.", {
      ticker: { type: "string", description: "e.g. AAPL, NVDA, TSLA" },
    }, ["ticker"]),
    fn("get_macro", "Live US macro data from FRED: effective fed funds rate, 2y and 10y Treasury yields and spread, 30y mortgage rate, unemployment, CPI with YoY inflation.", {}),
    fn("audit_finances", "Accountant/auditor report on the user's own account: income & expense statement, category breakdown, net cash flow, savings rate, recurring charges/subscriptions, duplicate and unusual transactions, unpaid bills, liquidity. Exact maths.", {
      period_days: { type: "integer", description: "Statement period in days (7-90). Default 30." },
    }),
    fn("accounting_check", "Deterministic personal balance sheet (assets = cash + savings + priced holdings; liabilities = unpaid bills; equity) with an A = L + E check and the income-statement check. Unpriced holdings are flagged, not guessed.", {
      period_days: { type: "integer", description: "Income statement period (7-90). Default 30." },
    }),
    fn("quant_monte_carlo", "Monte Carlo projection (GBM, monthly steps) of a portfolio with contributions. Returns p10/p50/p90 and chance of ending below contributions.", {
      principal: { type: "number" }, monthly: { type: "number" }, years: { type: "number" },
      mu: { type: "number", description: "Expected annual return as decimal, e.g. 0.07" },
      sigma: { type: "number", description: "Annual volatility as decimal, e.g. 0.15" },
    }, ["principal", "years", "mu", "sigma"]),
    fn("quant_allocation", "Long-only mean-variance (max Sharpe) allocation for 2-8 assets given expected return and volatility.", {
      assets: { type: "array", items: { type: "object", properties: { symbol: { type: "string" }, mu: { type: "number" }, sigma: { type: "number" } }, required: ["symbol", "mu", "sigma"] } },
      correlation: { type: "number", description: "Average pairwise correlation, default 0.3" },
      risk_free: { type: "number", description: "Default 0.04" },
    }, ["assets"]),
    fn("quant_black_scholes", "Black-Scholes European option price and greeks.", {
      S: { type: "number", description: "Spot (from get_prices)" }, K: { type: "number" }, T: { type: "number", description: "Years to expiry" },
      r: { type: "number", description: "Risk-free rate decimal" }, sigma: { type: "number", description: "Volatility decimal" },
      type: { type: "string", enum: ["call", "put"] },
    }, ["S", "K", "T", "r", "sigma"]),
    fn("shop_search", "Free product search (DuckDuckGo results + Google Shopping/Amazon/eBay links). Prices only when listed.", {
      query: { type: "string" },
    }, ["query"]),
    fn("plan_trip", "Calendar-style trip skeleton: dated days with morning/afternoon/evening slots, maps, flight and hotel search links. No bookings.", {
      destination: { type: "string" }, start_date: { type: "string", description: "YYYY-MM-DD" }, days: { type: "integer" },
    }, ["destination"]),
    fn("plan_event", "Event card: date/time/location, maps and add-to-calendar link, checklist, missing fields.", {
      title: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" }, time: { type: "string", description: "HH:MM" }, location: { type: "string" },
    }, ["title"]),
    fn("quant_signal", "Quant engine fast path (paper only): live-quote z-score, regime and vol-target weight per symbol. AI may propose parameters; hard bounds clamp them. Never places orders.", {
      symbols: { type: "array", items: { type: "string" } },
      vol_target_pct: { type: "number" }, lookback_sigma: { type: "number" },
    }, ["symbols"]),
    fn("macro_posture", "Macro advisory engine: FRED-based risk posture (risk_on / neutral / risk_off) with reasons; private-equity data is a stub.", {}),
    fn("governor_check", "Governor: cross-asset risk check of a PROPOSED paper allocation against the user's shared limits (concentration, class caps, portfolio vol, drawdown, kill switch). Returns approve / scale_down / block with the adjusted weights. Cannot trade.", {
      positions: { type: "array", items: { type: "object", properties: { symbol: { type: "string" }, cls: { type: "string", enum: ["crypto", "equity", "option", "cash"] }, weight_pct: { type: "number" } }, required: ["symbol", "cls", "weight_pct"] } },
      current_drawdown_pct: { type: "number" },
      use_macro: { type: "boolean", description: "Apply the macro posture (risk_off halves crypto/option caps). Default true." },
    }, ["positions"]),
    fn("maps_link", "Google Maps search link for a place or address.", { query: { type: "string" } }, ["query"]),
  ];
  if (withGoals) {
    defs.push(
      fn("set_goal", "Save a savings goal for the user (only when they ask to set one).", {
        goal: { type: "string" },
        target_amount: { type: "number" },
        target_date: { type: "string", description: "YYYY-MM-DD" },
      }, ["goal"]),
      fn("list_goals", "The user's saved goals, each with its id.", {}),
      fn("delete_goal", "Delete one of the user's saved goals by its id from list_goals. Only when the user explicitly asks to remove a goal.", {
        goal_id: { type: "string", description: "The goal's id (uuid) from list_goals." },
      }, ["goal_id"]),
    );
  }
  return defs;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function quote(a: AccountData, sym: string) {
  const s = sym.toUpperCase().replace(/^\$/, "");
  return a.cryptoQuotes[s] ?? a.stockQuotes[s] ?? a.stockQuotes[s.replace(".", "-")];
}

/** Tiny safe arithmetic evaluator (numbers, + - * / and parentheses only). */
export function evalArithmetic(expr: string): number {
  const src = expr.replace(/,/g, "").replace(/\s+/g, "");
  if (!/^[\d.+\-*/()]+$/.test(src) || src.length > 200) throw new Error("unsupported expression");
  let i = 0;
  const num = (): number => {
    if (src[i] === "(") {
      i++;
      const v = add();
      if (src[i++] !== ")") throw new Error("bad parens");
      return v;
    }
    if (src[i] === "-") {
      i++;
      return -num();
    }
    const m = /^\d+(\.\d+)?|^\.\d+/.exec(src.slice(i));
    if (!m) throw new Error("bad number");
    i += m[0].length;
    return Number(m[0]);
  };
  const mul = (): number => {
    let v = num();
    while (src[i] === "*" || src[i] === "/") {
      const op = src[i++];
      const b = num();
      v = op === "*" ? v * b : v / b;
    }
    return v;
  };
  const add = (): number => {
    let v = mul();
    while (src[i] === "+" || src[i] === "-") {
      const op = src[i++];
      const b = mul();
      v = op === "+" ? v + b : v - b;
    }
    return v;
  };
  const v = add();
  if (i !== src.length || !Number.isFinite(v)) throw new Error("bad expression");
  return v;
}

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolCtx): Promise<unknown> {
  const a = ctx.account;
  const n = (k: string, d = 0) => (typeof args[k] === "number" && Number.isFinite(args[k] as number) ? (args[k] as number) : d);
  const s = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : "");
  switch (name) {
    case "get_balances": {
      const value = (h: { code: string; amount: number }) => {
        const q = quote(a, h.code);
        return { symbol: h.code, amount: h.amount, usd_value: q ? r2(q.price * h.amount) : null };
      };
      return { wallets: a.wallets, crypto: a.crypto.map(value), stocks: a.stocks.map(value) };
    }
    case "get_transactions": {
      const days = Math.min(90, Math.max(1, Math.round(n("range_days", 30))));
      const cat = s("category").toLowerCase();
      const since = (a.now ?? new Date()).getTime() - days * 86400000;
      const rows = a.transactions.filter((t) => new Date(t.created_at).getTime() >= since && t.type !== "welcome_bonus")
        .filter((t) => {
          if (!cat) return true;
          const meta = (t.metadata ?? {}) as Record<string, unknown>;
          return [t.type, String(meta.category ?? ""), t.description ?? ""].some((x) => x.toLowerCase().includes(cat));
        })
        .slice(0, 50)
        .map((t) => ({ date: t.created_at.slice(0, 10), type: t.type, amount: t.amount, currency: t.currency, status: t.status, description: t.description }));
      const { total, income, categories } = spendingByCategory(a.transactions, days, a.now);
      return { range_days: days, transactions: rows, spent_total: r2(total), received_total: r2(income), by_category: Object.fromEntries(categories.map(([k, v]) => [k, r2(v)])) };
    }
    case "get_bills":
      return { bills: a.bills };
    case "get_savings": {
      const w = a.wallets.find((x) => x.currency === "USD") ?? a.wallets[0];
      return { savings_balance: w?.savings_balance ?? 0, available: w?.balance ?? 0, currency: w?.currency ?? "USD", apy_percent: APY_RATE, interest_paid: false, note: "apy_percent is an illustration. Do not say the user earns it." };
    }
    case "get_prices": {
      const syms = Array.isArray(args.symbols) ? (args.symbols as unknown[]).map(String).slice(0, 15) : [];
      return Object.fromEntries(syms.map((x) => {
        const q = quote(a, x);
        return [x.toUpperCase(), q ? { usd: q.price, change_24h_percent: r2(q.changePct) } : { usd: null, flag: "missing_data", note: "no live price; do not estimate" }];
      }));
    }
    case "calculate": {
      const op = s("op");
      const apy = n("apy", APY_RATE);
      if (op === "compound_savings") {
        const principal = n("principal"), monthly = n("monthly"), years = n("years", 1);
        const fv = projectSavings(principal, monthly, years, apy);
        const contributed = principal + monthly * Math.round(years * 12);
        return { op, apy_percent: apy, principal, monthly, years, future_value: r2(fv), contributed: r2(contributed), illustrated_interest: r2(fv - contributed), interest_paid: false };
      }
      if (op === "monthly_needed") {
        const target = n("target"), months = Math.max(1, Math.round(n("months", 12))), principal = n("principal");
        const r = Math.pow(1 + apy / 100, 1 / 12) - 1;
        const grown = principal * Math.pow(1 + r, months);
        const factor = r === 0 ? months : (Math.pow(1 + r, months) - 1) / r;
        return { op, apy_percent: apy, target, months, principal, monthly_needed: r2(Math.max(0, (target - grown) / factor)) };
      }
      if (op === "budget_50_30_20") {
        const income = n("income");
        return { op, income, needs: r2(income * 0.5), wants: r2(income * 0.3), savings: r2(income * 0.2) };
      }
      if (op === "convert") {
        const amount = n("amount"), from = s("from").toUpperCase(), to = s("to").toUpperCase();
        const toUsd = async (c: string): Promise<number | null> => {
          if (c === "USD") return 1;
          const q = quote(a, c);
          if (q) return q.price;
          const rates = ctx.fiatRates ? await ctx.fiatRates().catch(() => ({} as Record<string, number>)) : {};
          return rates[c] ? 1 / rates[c] : null;
        };
        const [f, t] = [await toUsd(from), await toUsd(to)];
        if (f == null || t == null) return { op, error: `no rate for ${f == null ? from : to}` };
        const result = (amount * f) / t;
        return { op, amount, from, to, result: Number(result.toPrecision(10)), rate: Number((f / t).toPrecision(10)) };
      }
      if (op === "days_until") {
        const today = todayISO(a.now ?? new Date(), a.timeZone ?? "UTC");
        const m = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(s("date").trim());
        if (!m) return { op, error: "date must be YYYY-MM-DD or MM-DD" };
        let y = m[1] ? Number(m[1]) : Number(today.slice(0, 4));
        const md = `-${m[2]}-${m[3]}`;
        while (`${y}${md}` < today) y++;
        const target = `${y}${md}`;
        const days = Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
        return { op, today, target, days };
      }
      if (op === "arithmetic") {
        try {
          return { op, expression: s("expression"), result: Number(evalArithmetic(s("expression")).toPrecision(12)) };
        } catch (e) {
          return { op, error: e instanceof Error ? e.message : "bad expression" };
        }
      }
      return { error: `unknown op ${op}` };
    }
    case "get_news":
      return await getNews(s("query"), n("limit", 8));
    case "get_market_sentiment":
      return await getMarketSentiment();
    case "get_company_fundamentals":
      return await getCompanyFundamentals(s("ticker"));
    case "get_macro":
      return await getMacro(a.now ?? new Date());
    case "audit_finances": {
      const audit = auditFinances(a, n("period_days", 30));
      const books = checkBooks({ assets: { total: 0 }, liabilities: { total: 0 }, equity: 0 }, audit.income_statement);
      return { ...audit, books_check: books };
    }
    case "accounting_check": {
      const raw = balanceSheet(a);
      const audit = auditFinances(a, n("period_days", 30));
      let check = checkBooks(raw, audit.income_statement);
      let sheet = raw;
      let corrected = false;
      if (!check.ok) {
        const fx = selfCorrect(raw);
        sheet = fx.sheet; corrected = fx.corrected; check = checkBooks(sheet, audit.income_statement);
      }
      return { balance_sheet: sheet, income_statement: audit.income_statement, check, self_corrected: corrected };
    }
    case "quant_monte_carlo":
      return monteCarlo({ principal: n("principal", NaN), monthly: n("monthly", 0), years: n("years", NaN), mu: n("mu", NaN), sigma: n("sigma", NaN) });
    case "quant_allocation": {
      const list = Array.isArray(args.assets) ? (args.assets as { symbol: string; mu: number; sigma: number }[]).slice(0, 8) : [];
      return list.length ? meanVariance(list, n("correlation", 0.3), n("risk_free", 0.04)) : missing("assets");
    }
    case "quant_black_scholes":
      return blackScholes({ S: n("S", NaN), K: n("K", NaN), T: n("T", NaN), r: n("r", NaN), sigma: n("sigma", NaN), type: s("type") === "put" ? "put" : "call" });
    case "shop_search":
      return await shopSearch(s("query"));
    case "plan_trip":
      return planTrip({ destination: s("destination"), start_date: s("start_date"), days: n("days", 3), today: todayISO(a.now ?? new Date(), a.timeZone ?? "UTC") });
    case "plan_event":
      return planEvent({ title: s("title"), date: s("date"), time: s("time"), location: s("location"), today: todayISO(a.now ?? new Date(), a.timeZone ?? "UTC") });
    case "quant_signal": {
      const syms = Array.isArray(args.symbols) ? (args.symbols as unknown[]).map(String).slice(0, 10) : [];
      const params = clampParams({ vol_target_pct: n("vol_target_pct", NaN), lookback_sigma: n("lookback_sigma", NaN) });
      return {
        params, paper_only: true,
        signals: syms.map((x) => {
          const sym = x.toUpperCase();
          const cls: AssetClass = a.cryptoQuotes[sym] ? "crypto" : "equity";
          return quantSignal(sym, quote(a, sym), cls, params);
        }),
      };
    }
    case "macro_posture": {
      const m = await getMacro(a.now ?? new Date()) as Record<string, { value?: number; yoy_inflation_percent?: number | null }> & { spread_10y_minus_2y?: number };
      return {
        ...macroPosture({ yield_curve_10y_2y: m.spread_10y_minus_2y ?? null, cpi_yoy: m.cpi?.yoy_inflation_percent ?? null, unemployment: m.unemployment?.value ?? null, fed_funds: m.fed_funds_effective?.value ?? null }),
        inputs: { spread_10y_minus_2y: m.spread_10y_minus_2y ?? null, cpi_yoy: m.cpi?.yoy_inflation_percent ?? null, unemployment: m.unemployment?.value ?? null },
        private_equity: PRIVATE_EQUITY_STUB,
      };
    }
    case "governor_check": {
      const pos = (Array.isArray(args.positions) ? args.positions : []).slice(0, 20).map((p) => {
        const o = p as Record<string, unknown>;
        const cls = ["crypto", "equity", "option", "cash"].includes(String(o.cls)) ? (o.cls as AssetClass) : "equity";
        return { symbol: String(o.symbol ?? "?").toUpperCase(), cls, weight_pct: typeof o.weight_pct === "number" ? o.weight_pct : NaN } as Position;
      });
      if (!pos.length) return missing("positions");
      let posture: string | undefined;
      if (args.use_macro !== false) {
        try {
          const m = await getMacro(a.now ?? new Date()) as Record<string, { value?: number; yoy_inflation_percent?: number | null }> & { spread_10y_minus_2y?: number };
          posture = macroPosture({ yield_curve_10y_2y: m.spread_10y_minus_2y ?? null, cpi_yoy: m.cpi?.yoy_inflation_percent ?? null, unemployment: m.unemployment?.value ?? null }).posture;
        } catch { posture = undefined; }
      }
      const limits = ctx.risk?.limits ?? DEFAULT_LIMITS;
      return { ...governor(pos, limits, { posture, current_drawdown_pct: n("current_drawdown_pct", 0) }), macro_posture: posture ?? "unknown", limits, targets: ctx.risk?.targets ?? DEFAULT_TARGETS, limits_source: ctx.risk?.backend ?? "defaults" };
    }
    case "maps_link":
      return s("query") ? { query: s("query"), map: mapsLink(s("query")) } : missing("place");
    case "set_goal": {
      if (!ctx.goals) return { error: "goals not available" };
      let date = /^\d{4}-\d{2}-\d{2}$/.test(s("target_date")) ? s("target_date") : null;
      // Models don't know today's date; never save a goal in the past. Roll a past
      // date forward to its next occurrence (e.g. "Dec 31" -> this or next year).
      if (date) {
        const today = todayISO(a.now ?? new Date(), a.timeZone ?? "UTC");
        const md = date.slice(4);
        let y = Number(date.slice(0, 4));
        while (`${y}${md}` < today) y++;
        date = `${y}${md}`;
      }
      const amt = typeof args.target_amount === "number" ? args.target_amount : null;
      const { data, error } = await ctx.goals.insert({ goal: s("goal").slice(0, 300), target_amount: amt, target_date: date });
      return error ? { error: "could not save goal" } : { saved: data };
    }
    case "list_goals": {
      if (!ctx.goals) return { error: "goals not available" };
      const { data, error } = await ctx.goals.list();
      return error ? { error: "could not load goals" } : { goals: data ?? [] };
    }
    case "delete_goal": {
      if (!ctx.goals) return { error: "goals not available" };
      const id = s("goal_id").trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return { error: "invalid goal_id; call list_goals for ids" };
      const { data, error } = await ctx.goals.remove(id);
      if (error) return { error: "could not delete goal" };
      return (data ?? []).length ? { deleted: id } : { error: "no goal with that id" };
    }
    default:
      return { error: `unknown tool ${name}` };
  }
}
