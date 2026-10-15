// Deterministic accounting core: builds a personal balance sheet and checks the books.
// Assets = Liabilities + Equity must hold; income - expenses = net. Broken maths is rejected
// and recomputed from source rows (self-correct), with every issue listed.
import type { AccountData } from "./rules.ts";

const r2 = (n: number) => Math.round(n * 100) / 100;
const EPS = 0.01;

export function balanceSheet(a: AccountData) {
  const flagged: string[] = [];
  const price = (code: string) => {
    const s = code.toUpperCase();
    const q = a.cryptoQuotes[s] ?? a.stockQuotes[s];
    return q && Number.isFinite(q.price) && q.price > 0 ? q.price : null;
  };
  const usd = a.wallets.filter((w) => w.currency === "USD");
  const cash = usd.reduce((s, w) => s + (Number(w.balance) || 0), 0);
  const savings = usd.reduce((s, w) => s + (Number(w.savings_balance) || 0), 0);
  let investments = 0;
  for (const h of [...a.crypto, ...a.stocks]) {
    const p = price(h.code);
    if (p == null) flagged.push(`${h.code}: no live price, excluded`);
    else investments += p * h.amount;
  }
  for (const w of a.wallets.filter((w) => w.currency !== "USD")) flagged.push(`${w.currency} wallet not converted, excluded`);
  const liabilities = a.bills.filter((b) => !b.is_paid).reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const assets = cash + savings + investments;
  const equity = assets - liabilities;
  return {
    assets: { cash: r2(cash), savings: r2(savings), investments: r2(investments), total: r2(assets) },
    liabilities: { unpaid_bills: r2(liabilities), total: r2(liabilities) },
    equity: r2(equity),
    flagged,
  };
}

export type BookCheck = { ok: boolean; issues: string[] };

/** Validates a balance sheet and an income statement. Pure; never throws. */
export function checkBooks(sheet: { assets: { total: number; cash?: number; savings?: number; investments?: number }; liabilities: { total: number }; equity: number },
  stmt?: { total_income: number; total_expenses: number; net_cash_flow: number; expenses_by_category?: Record<string, number> }): BookCheck {
  const issues: string[] = [];
  const nums = [sheet.assets.total, sheet.liabilities.total, sheet.equity];
  if (nums.some((n) => !Number.isFinite(n))) issues.push("non-numeric figure in balance sheet");
  else {
    if (Math.abs(sheet.assets.total - (sheet.liabilities.total + sheet.equity)) > EPS) issues.push("assets != liabilities + equity");
    const parts = [sheet.assets.cash, sheet.assets.savings, sheet.assets.investments].filter((x) => typeof x === "number") as number[];
    if (parts.length === 3 && Math.abs(parts.reduce((s, x) => s + x, 0) - sheet.assets.total) > EPS) issues.push("asset lines don't sum to total");
  }
  if (stmt) {
    if (![stmt.total_income, stmt.total_expenses, stmt.net_cash_flow].every(Number.isFinite)) issues.push("non-numeric figure in income statement");
    else {
      if (Math.abs(stmt.total_income - stmt.total_expenses - stmt.net_cash_flow) > EPS) issues.push("income - expenses != net cash flow");
      if (stmt.expenses_by_category) {
        const s = Object.values(stmt.expenses_by_category).reduce((t, x) => t + x, 0);
        if (Math.abs(s - stmt.total_expenses) > 0.05) issues.push("expense categories don't sum to total");
      }
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Re-derives totals from line items when a check fails (self-correct), and reports what changed. */
export function selfCorrect<T extends { assets: { cash: number; savings: number; investments: number; total: number }; liabilities: { unpaid_bills: number; total: number }; equity: number }>(s: T) {
  const fixed = structuredClone(s);
  fixed.assets.total = r2(fixed.assets.cash + fixed.assets.savings + fixed.assets.investments);
  fixed.liabilities.total = r2(fixed.liabilities.unpaid_bills);
  fixed.equity = r2(fixed.assets.total - fixed.liabilities.total);
  return { sheet: fixed, check: checkBooks(fixed), corrected: JSON.stringify(fixed) !== JSON.stringify(s) };
}
