// Exo accountant/auditor: exact statements over the user's own transactions and bills
// (already loaded through their RLS session). Pure function, no network.
import { type AccountData, OUTFLOW } from "./rules.ts";

const r2 = (n: number) => Math.round(n * 100) / 100;
const INFLOW = new Set(["deposit", "receive", "interest", "cashback"]);

export function auditFinances(a: AccountData, periodDays = 30) {
  const now = a.now ?? new Date();
  const days = Math.min(90, Math.max(7, Math.round(periodDays)));
  const since = now.getTime() - days * 86400000;
  const rows = a.transactions
    .filter((t) => t.type !== "welcome_bonus" && (!t.status || t.status === "completed"))
    .map((t) => {
      const meta = (t.metadata ?? {}) as Record<string, unknown>;
      return {
        date: t.created_at.slice(0, 10),
        ts: new Date(t.created_at).getTime(),
        type: t.type,
        amount: Math.abs(Number(t.amount) || 0),
        currency: t.currency,
        category: (typeof meta.category === "string" && meta.category) || t.type,
        payee: (t.recipient || t.description || t.type || "").toString().trim(),
      };
    });
  const inPeriod = rows.filter((t) => t.ts >= since);

  // Income & expense statement
  const income: Record<string, number> = {};
  const expenses: Record<string, number> = {};
  let totalIn = 0, totalOut = 0;
  for (const t of inPeriod) {
    if (INFLOW.has(t.type)) {
      income[t.type] = r2((income[t.type] ?? 0) + t.amount);
      totalIn += t.amount;
    } else if (OUTFLOW.has(t.type)) {
      expenses[t.category] = r2((expenses[t.category] ?? 0) + t.amount);
      totalOut += t.amount;
    }
  }
  const net = totalIn - totalOut;
  const categoryBreakdown = Object.entries(expenses).sort((x, y) => y[1] - x[1])
    .map(([category, amount]) => ({ category, amount, share_percent: totalOut ? r2((amount / totalOut) * 100) : 0 }));

  // Recurring charges: same payee + similar amount on 2+ different dates across the 90 days loaded.
  const groups = new Map<string, typeof rows>();
  for (const t of rows.filter((t) => OUTFLOW.has(t.type))) {
    const key = `${t.payee.toLowerCase()}|${Math.round(t.amount)}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const recurring = [...groups.values()].filter((g) => new Set(g.map((t) => t.date)).size >= 2).map((g) => {
    const dates = [...new Set(g.map((t) => t.date))].sort();
    const gaps = dates.slice(1).map((d, i) => (Date.parse(d) - Date.parse(dates[i])) / 86400000);
    const avgGap = gaps.reduce((s, x) => s + x, 0) / gaps.length;
    const cadence = avgGap >= 25 && avgGap <= 35 ? "monthly" : avgGap >= 6 && avgGap <= 8 ? "weekly" : avgGap >= 12 && avgGap <= 16 ? "bi-weekly" : `every ~${Math.round(avgGap)} days`;
    const amt = g[0].amount;
    return { payee: g[0].payee, amount: amt, currency: g[0].currency, occurrences: g.length, last: dates.at(-1), cadence, annualized_cost: cadence === "monthly" ? r2(amt * 12) : cadence === "weekly" ? r2(amt * 52) : cadence === "bi-weekly" ? r2(amt * 26) : null };
  });

  // Duplicates: same payee + same amount within 48 hours.
  const out = inPeriod.filter((t) => OUTFLOW.has(t.type)).sort((x, y) => x.ts - y.ts);
  const duplicates: { payee: string; amount: number; dates: string[] }[] = [];
  for (let i = 1; i < out.length; i++) {
    const p = out[i - 1], c = out[i];
    if (p.payee.toLowerCase() === c.payee.toLowerCase() && p.amount === c.amount && c.ts - p.ts <= 48 * 3600_000) {
      duplicates.push({ payee: c.payee, amount: c.amount, dates: [p.date, c.date] });
    }
  }
  // Unusual: outflows more than 3x the median outflow and above $50.
  const amounts = out.map((t) => t.amount).sort((x, y) => x - y);
  const median = amounts.length ? amounts[Math.floor(amounts.length / 2)] : 0;
  const unusual = out.filter((t) => median > 0 && t.amount > 3 * median && t.amount > 50)
    .map((t) => ({ date: t.date, payee: t.payee, amount: t.amount, times_median: r2(t.amount / median) }));

  const unpaidBills = a.bills.filter((b) => !b.is_paid);
  const billsDue = r2(unpaidBills.reduce((s, b) => s + b.amount, 0));
  const usd = a.wallets.find((w) => w.currency === "USD") ?? a.wallets[0];

  return {
    period_days: days,
    period: { from: new Date(since).toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) },
    transactions_counted: inPeriod.length,
    income_statement: { income_by_type: income, total_income: r2(totalIn), expenses_by_category: expenses, total_expenses: r2(totalOut), net_cash_flow: r2(net) },
    savings_rate_percent: totalIn > 0 ? r2((net / totalIn) * 100) : null,
    average_daily_spend: r2(totalOut / days),
    category_breakdown: categoryBreakdown,
    recurring_charges: recurring,
    duplicate_suspects: duplicates,
    unusual_transactions: unusual,
    median_outflow: r2(median),
    bills: { unpaid_count: unpaidBills.length, unpaid_total: billsDue, unpaid: unpaidBills.map((b) => ({ biller: b.biller_name, amount: b.amount, due: b.due_date })) },
    liquidity: usd ? { available: usd.balance, savings: usd.savings_balance, available_after_unpaid_bills: r2(usd.balance - billsDue) } : null,
    notes: "Only completed transactions; welcome bonus excluded; amounts in each transaction's own currency (mostly USD).",
  };
}
