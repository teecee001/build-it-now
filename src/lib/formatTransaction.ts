/** Shared transaction display helpers (especially multi-currency converts). */

export type TxLike = {
  type: string;
  amount: number;
  currency?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

export function formatAmount(amount: number, currency: string): string {
  const cur = (currency || "USD").toUpperCase();
  const abs = Math.abs(Number(amount) || 0);
  let maxFrac = 2;
  if (["JPY", "KRW", "VND"].includes(cur)) maxFrac = 0;
  else if (["NGN", "GHS", "KES", "UGX"].includes(cur) && abs >= 100) maxFrac = 2;
  else if (abs > 0 && abs < 0.01) maxFrac = 6;
  else if (abs > 0 && abs < 1) maxFrac = 4;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: maxFrac,
      minimumFractionDigits: maxFrac === 0 ? 0 : Math.min(2, maxFrac),
    }).format(abs);
  } catch {
    return `${abs.toFixed(maxFrac)} ${cur}`;
  }
}

function parseConvertDescription(description: string | null | undefined) {
  if (!description) return null;
  const match = description.match(
    /Converted\s+([\d.,]+)\s+([A-Za-z]{3})\s*[→\-]+\s*([\d.,]+)\s+([A-Za-z]{3})/i,
  );
  if (!match) return null;
  return {
    fromAmt: Number(match[1].replace(/,/g, "")),
    from: match[2].toUpperCase(),
    toAmt: Number(match[3].replace(/,/g, "")),
    to: match[4].toUpperCase(),
  };
}

export function getConversionDisplay(tx: TxLike) {
  const m = (tx.metadata || {}) as Record<string, unknown>;
  let from = String(m.from || m.from_currency || "");
  let to = String(m.to || m.to_currency || "");
  let fromAmt = Number(m.from_amount);
  let toAmt = Number(m.to_amount);

  if (!from || !to || !Number.isFinite(fromAmt) || !Number.isFinite(toAmt) || toAmt <= 0) {
    const parsed = parseConvertDescription(tx.description);
    if (!parsed) return null;
    from = parsed.from;
    to = parsed.to;
    fromAmt = parsed.fromAmt;
    toAmt = parsed.toAmt;
  }

  if (!from || !to || !Number.isFinite(fromAmt) || !Number.isFinite(toAmt)) return null;

  const left = formatAmount(fromAmt, from);
  const right = formatAmount(toAmt, to);
  return {
    title: `Converted ${from} → ${to}`,
    detail: `${left} → ${right}`,
    amountText: `${left} → ${right}`,
  };
}

export function getTransactionTitle(tx: TxLike): string {
  if (tx.type === "conversion" || tx.type === "convert") {
    return getConversionDisplay(tx)?.title || tx.description || "Conversion";
  }
  return tx.description || tx.type;
}

export function formatTxAmount(tx: TxLike): { text: string; tone: "in" | "out" | "neutral" } {
  if (tx.type === "conversion" || tx.type === "convert") {
    const c = getConversionDisplay(tx);
    if (c) return { text: c.amountText, tone: "neutral" };
  }
  const amount = Number(tx.amount);
  const cur = (tx.currency || "USD").toUpperCase();
  const sign = amount >= 0 ? "+" : "-";
  return {
    text: `${sign}${formatAmount(amount, cur)}`,
    tone: amount >= 0 ? "in" : "out",
  };
}
