// Exo server-side tools. Account reads come from data already loaded through the
// user's own RLS client; goals go through that same client. No service role here.
import { auditFinances } from "./audit.ts";
import { getCompanyFundamentals, getMacro, getMarketSentiment, getNews } from "./live.ts";
import { type AccountData, APY_RATE, projectSavings, spendingByCategory, todayISO } from "./rules.ts";

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
};

const fn = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});

export function toolDefs(withGoals: boolean) {
  const defs = [
    fn("get_balances", "Wallet balances (available and savings) for each currency, plus crypto/stock holdings valued at live prices.", {}),
    fn("get_transactions", "The user's transactions from their account.", {
      range_days: { type: "integer", description: "Look-back window in days (1-90). Default 30." },
      category: { type: "string", description: "Optional category or type filter, e.g. Dining, Bills, send." },
    }),
    fn("get_bills", "The user's bills with amount, due date and paid status.", {}),
    fn("get_savings", `Savings vault balance and the app's savings APY (${APY_RATE}%).`, {}),
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
      apy: { type: "number", description: `Defaults to the app's ${APY_RATE}% APY.` },
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
      return { savings_balance: w?.savings_balance ?? 0, available: w?.balance ?? 0, currency: w?.currency ?? "USD", apy_percent: APY_RATE };
    }
    case "get_prices": {
      const syms = Array.isArray(args.symbols) ? (args.symbols as unknown[]).map(String).slice(0, 15) : [];
      return Object.fromEntries(syms.map((x) => {
        const q = quote(a, x);
        return [x.toUpperCase(), q ? { usd: q.price, change_24h_percent: r2(q.changePct) } : null];
      }));
    }
    case "calculate": {
      const op = s("op");
      const apy = n("apy", APY_RATE);
      if (op === "compound_savings") {
        const principal = n("principal"), monthly = n("monthly"), years = n("years", 1);
        const fv = projectSavings(principal, monthly, years, apy);
        const contributed = principal + monthly * Math.round(years * 12);
        return { op, apy_percent: apy, principal, monthly, years, future_value: r2(fv), contributed: r2(contributed), interest_earned: r2(fv - contributed) };
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
    case "audit_finances":
      return auditFinances(a, n("period_days", 30));
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
