// Exo Quant layer: deterministic maths in plain TypeScript (no paid deps, no network).
// Every function validates inputs and returns { error, flag: "missing_data" } instead of NaN.
const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const fin = (...xs: unknown[]) => xs.every((x) => typeof x === "number" && Number.isFinite(x));
export const missing = (what: string) => ({ error: `${what} not available`, flag: "missing_data" as const, value: null });

/** Seeded PRNG (mulberry32) so results are reproducible and testable. */
export function rng(seed = 42) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (u: () => number) => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u());

/** Monte Carlo of a monthly-contribution portfolio under GBM. mu/sigma are annual decimals. */
export function monteCarlo(p: { principal: number; monthly?: number; years: number; mu: number; sigma: number; paths?: number; seed?: number }) {
  const monthly = p.monthly ?? 0;
  if (!fin(p.principal, monthly, p.years, p.mu, p.sigma) || p.years <= 0 || p.sigma < 0) return missing("valid principal/years/mu/sigma");
  const paths = Math.min(5000, Math.max(100, Math.round(p.paths ?? 2000)));
  const months = Math.min(600, Math.round(p.years * 12));
  const u = rng(p.seed ?? 42);
  const dt = 1 / 12, drift = (p.mu - 0.5 * p.sigma ** 2) * dt, vol = p.sigma * Math.sqrt(dt);
  const ends: number[] = [];
  for (let i = 0; i < paths; i++) {
    let v = p.principal;
    for (let m = 0; m < months; m++) v = v * Math.exp(drift + vol * gauss(u)) + monthly;
    ends.push(v);
  }
  ends.sort((a, b) => a - b);
  const pct = (q: number) => r2(ends[Math.min(ends.length - 1, Math.floor(q * ends.length))]);
  const contributed = p.principal + monthly * months;
  return {
    paths, years: p.years, contributed: r2(contributed),
    p10: pct(0.1), p50: pct(0.5), p90: pct(0.9),
    prob_below_contributed_percent: r2((ends.filter((x) => x < contributed).length / paths) * 100),
    assumptions: { mu: p.mu, sigma: p.sigma, model: "geometric Brownian motion, monthly steps" },
  };
}

/** Long-only mean-variance allocation (max Sharpe) via projected gradient on the simplex. */
export function meanVariance(assets: { symbol: string; mu: number; sigma: number }[], corr = 0.3, rf = 0.04) {
  const ok = assets.filter((a) => a && typeof a.symbol === "string" && fin(a.mu, a.sigma) && a.sigma > 0);
  const flagged = assets.filter((a) => !ok.includes(a)).map((a) => String(a?.symbol ?? "?"));
  if (ok.length < 2) return { ...missing("expected return and volatility for at least 2 assets"), flagged };
  const n = ok.length, c = Math.max(-0.99, Math.min(0.99, fin(corr) ? corr : 0.3));
  const cov = ok.map((a, i) => ok.map((b, j) => (i === j ? a.sigma ** 2 : c * a.sigma * b.sigma)));
  const stats = (w: number[]) => {
    const ret = w.reduce((s, x, i) => s + x * ok[i].mu, 0);
    const v = w.reduce((s, x, i) => s + x * w.reduce((t, y, j) => t + y * cov[i][j], 0), 0);
    return { ret, vol: Math.sqrt(Math.max(v, 1e-12)) };
  };
  const sharpe = (w: number[]) => { const s = stats(w); return (s.ret - rf) / s.vol; };
  const project = (w: number[]) => { // Euclidean projection onto the probability simplex
    const s = [...w].sort((a, b) => b - a);
    let cum = 0, theta = 0;
    for (let i = 0; i < n; i++) { cum += s[i]; const t = (cum - 1) / (i + 1); if (s[i] - t > 0) theta = t; }
    return w.map((x) => Math.max(0, x - theta));
  };
  let w = Array(n).fill(1 / n);
  for (let it = 0; it < 600; it++) {
    const base = sharpe(w), g = w.map((_, i) => { const e = [...w]; e[i] += 1e-5; return (sharpe(e) - base) / 1e-5; });
    w = project(w.map((x, i) => x + 0.01 * g[i]));
  }
  const s = stats(w);
  return {
    weights: Object.fromEntries(ok.map((a, i) => [a.symbol, r4(w[i])])),
    expected_return_percent: r2(s.ret * 100), volatility_percent: r2(s.vol * 100), sharpe: r2((s.ret - rf) / s.vol),
    assumptions: { correlation: c, risk_free: rf, long_only: true }, flagged,
  };
}

/** Standard normal CDF (Abramowitz-Stegun 7.1.26). */
export function normCdf(x: number) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/** Black-Scholes European option price + greeks. T in years, r and sigma annual decimals. */
export function blackScholes(p: { S: number; K: number; T: number; r: number; sigma: number; type?: "call" | "put" }) {
  if (!fin(p.S, p.K, p.T, p.r, p.sigma) || p.S <= 0 || p.K <= 0 || p.T <= 0 || p.sigma <= 0) return missing("spot, strike, time, rate and volatility");
  const sq = p.sigma * Math.sqrt(p.T);
  const d1 = (Math.log(p.S / p.K) + (p.r + p.sigma ** 2 / 2) * p.T) / sq, d2 = d1 - sq;
  const disc = Math.exp(-p.r * p.T), pdf = Math.exp(-(d1 ** 2) / 2) / Math.sqrt(2 * Math.PI);
  const call = p.type !== "put";
  const price = call ? p.S * normCdf(d1) - p.K * disc * normCdf(d2) : p.K * disc * normCdf(-d2) - p.S * normCdf(-d1);
  return { type: call ? "call" : "put", price: r4(price), delta: r4(call ? normCdf(d1) : normCdf(d1) - 1), gamma: r4(pdf / (p.S * sq)), vega_per_1pct: r4((p.S * pdf * Math.sqrt(p.T)) / 100), d1: r4(d1), d2: r4(d2) };
}

/** Stub interfaces for later phases (paid data, compiled engines, ML). Never called with real money. */
export const QUANT_STUBS = {
  sp_capital_iq: "stub: paid S&P data not connected",
  daloopa: "stub: paid fundamentals not connected",
  native_engine: "stub: Rust/C++ engine not built",
  lstm_forecast: "stub: model not trained",
} as const;
