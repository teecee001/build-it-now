import type { Transaction } from "@/hooks/useTransactions";

/** Converts an amount in a wallet currency to the displayed currency (null for non-wallet currencies). */
export type ToDisplay = (amount: number, currency: string) => number | null;

/** Signed effect of one transaction on the displayed total, from recorded data only (null = unknown). */
function deltaFor(tx: Transaction, toDisplay: ToDisplay): number | null {
  const m = (tx.metadata || {}) as Record<string, unknown>;
  if (tx.type === "conversion" || tx.type === "convert") {
    const from = String(m.from || m.from_currency || "").toUpperCase();
    const to = String(m.to || m.to_currency || "").toUpperCase();
    const fromAmt = Number(m.from_amount);
    const toAmt = Number(m.to_amount);
    if (!from || !to || !Number.isFinite(fromAmt) || !Number.isFinite(toAmt)) return null;
    return (toDisplay(toAmt, to) ?? 0) - (toDisplay(fromAmt, from) ?? 0);
  }
  const amt = Number(tx.amount);
  if (!Number.isFinite(amt)) return null;
  return toDisplay(amt, (tx.currency || "USD").toUpperCase()) ?? 0;
}

/**
 * Past values of the wallet total, oldest first, rebuilt by walking the user's recorded
 * transactions back from the current total. Returns [] whenever the data can't support
 * an honest series (unknown deltas, a negative past total, or fewer than 2 changes).
 */
export function balanceSeries(transactions: Transaction[], currentTotal: number, toDisplay: ToDisplay): number[] {
  const done = transactions
    .filter((t) => t.status === "completed")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const series = [currentTotal];
  let bal = currentTotal;
  for (const tx of done) {
    const d = deltaFor(tx, toDisplay);
    if (d === null) return [];
    if (Math.abs(d) < 1e-9) continue;
    bal -= d;
    if (bal < -0.005 * Math.max(1, currentTotal)) return [];
    series.push(Math.max(0, bal));
  }
  return series.length >= 3 ? series.reverse() : [];
}
