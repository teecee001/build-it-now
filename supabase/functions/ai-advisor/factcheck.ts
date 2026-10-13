// Fact-check: every $ amount and % in an answer must be backed by data Exo actually has.
// Pure functions so they can be tested without Deno/network.

export type Figure = { raw: string; value: number; kind: "money" | "pct" | "days" };

export function extractFigures(text: string): Figure[] {
  const out: Figure[] = [];
  const money = /(?:US)?\$\s?(\d[\d,]*(?:\.\d+)?)\s?(k|m|bn|b|thousand|million)?\b/gi;
  for (const m of text.matchAll(money)) {
    const mult: Record<string, number> = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, bn: 1e9 };
    out.push({ raw: m[0].trim(), value: Number(m[1].replace(/,/g, "")) * (mult[(m[2] ?? "").toLowerCase()] ?? 1), kind: "money" });
  }
  for (const m of text.matchAll(/([+-−]?\d+(?:\.\d+)?)\s?%/g)) {
    out.push({ raw: m[0].trim(), value: Math.abs(Number(m[1].replace("−", "-"))), kind: "pct" });
  }
  for (const m of text.matchAll(/\b(\d[\d,]*)\s+days?\b/gi)) {
    out.push({ raw: m[0].trim(), value: Number(m[1].replace(/,/g, "")), kind: "days" });
  }
  return out;
}

/** Every number that appears anywhere in the evidence (tool results, account summary, user messages). */
export function knownNumbers(evidence: string[]): number[] {
  const set = new Set<number>();
  for (const e of evidence) {
    for (const m of e.replace(/(\d),(?=\d{3})/g, "$1").matchAll(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)) {
      const v = Math.abs(Number(m[0]));
      if (Number.isFinite(v)) set.add(v);
    }
  }
  // Fixed facts of the app's savings feature and the 50/30/20 rule.
  for (const v of [50, 30, 20, 100]) set.add(v);
  return [...set];
}

function supported(f: Figure, known: number[]): boolean {
  if (f.value === 0) return true;
  return known.some((k) => {
    const diff = Math.abs(k - f.value);
    if (diff <= 0.011) return true; // cent rounding
    if (diff / Math.max(k, 1e-12) <= 0.005) return true; // display rounding (e.g. $83,446 vs 83446.2, $83.4k)
    // Whole-unit rounding of a known value, e.g. "$1,737" for 1737.14 or "6%" for 6.0
    return Number.isInteger(f.value) && Math.round(k) === f.value;
  });
}

export function unsupportedFigures(answer: string, evidence: string[]): Figure[] {
  const known = knownNumbers(evidence);
  return extractFigures(answer).filter((f) => !supported(f, known));
}
