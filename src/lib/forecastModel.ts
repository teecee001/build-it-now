// Probability model for ExoSky Forecasts.
// Converts real historical price series into market-style YES probabilities
// using a lognormal random-walk with realized volatility.

/** Daily log returns from a price series (oldest -> newest). */
export function logReturns(series: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < series.length; i++) {
    if (series[i - 1] > 0 && series[i] > 0) out.push(Math.log(series[i] / series[i - 1]));
  }
  return out;
}

/** Realized daily volatility (stdev of log returns). */
export function dailyVol(series: number[]): number {
  const r = logReturns(series);
  if (r.length < 2) return 0.01;
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const variance = r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1);
  return Math.max(Math.sqrt(variance), 0.0005);
}

/** Standard normal CDF (Abramowitz & Stegun). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-0.5 * x * x);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

/** P(price at horizon > target), driftless lognormal walk. */
export function probAbove(spot: number, target: number, vol: number, days: number): number {
  if (spot <= 0 || target <= 0 || days <= 0) return 0.5;
  const sigma = vol * Math.sqrt(days);
  if (sigma <= 0) return spot > target ? 1 : 0;
  return normCdf((Math.log(spot / target) - 0.5 * sigma * sigma) / sigma);
}

/** P(price touches target at any point before horizon) — reflection principle. */
export function probTouch(spot: number, target: number, vol: number, days: number): number {
  if (spot <= 0 || target <= 0 || days <= 0) return 0.5;
  const above = target > spot;
  const p = probAbove(spot, target, vol, days);
  const hit = above ? 2 * p : 2 * (1 - p);
  return Math.min(0.99, Math.max(0.01, hit));
}

/** Clamp a probability into a tradeable cent price (1–99). */
export function toCents(p: number): number {
  return Math.min(97, Math.max(3, Math.round(p * 100)));
}

/** Turn a price series into a 0–100 probability-style sparkline. */
export function toSpark(series: number[], points = 7): number[] {
  if (series.length === 0) return Array(points).fill(50);
  const step = Math.max(1, Math.floor(series.length / points));
  const sampled: number[] = [];
  for (let i = series.length - 1; i >= 0 && sampled.length < points; i -= step) sampled.unshift(series[i]);
  const min = Math.min(...sampled);
  const max = Math.max(...sampled);
  const range = max - min || 1;
  return sampled.map((v) => Math.round(((v - min) / range) * 100));
}

/** Format a future date the same way across the page. */
export function addDays(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Days remaining until the end of the current quarter. */
export function daysToQuarterEnd(): number {
  const now = new Date();
  const q = Math.floor(now.getUTCMonth() / 3);
  const end = new Date(Date.UTC(now.getUTCFullYear(), q * 3 + 3, 0));
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}

/** Days remaining until the end of the current month. */
export function daysToMonthEnd(): number {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 86400000));
}
