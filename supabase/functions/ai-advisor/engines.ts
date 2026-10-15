// Dual-Engine core (Phase 1, free stack, paper only — nothing here can place a trade).
//
//  ┌ Quant Engine (fast path) ─ deterministic signals + risk maths over free feeds.
//  │   AI is a risk/parameter controller: it may propose QuantParams, which are clamped
//  │   by hard limits; it never emits orders.
//  ├ Macro Advisory Engine (slow path) ─ FRED / SEC (live via live.ts) + private-equity stub.
//  └ Shared state ─ targets & limits both engines read. Upstash Redis REST (free tier) when
//    UPSTASH_REDIS_REST_URL/TOKEN are set, otherwise an in-memory store.
//  Governor ─ cross-asset risk check over both engines' outputs; can only approve, scale
//    down or block a *proposed* paper allocation.

export type AssetClass = "crypto" | "equity" | "option" | "cash";
export type Limits = {
  max_single_asset_pct: number; // concentration
  max_class_pct: Record<AssetClass, number>;
  max_portfolio_vol_pct: number; // annualised
  max_drawdown_pct: number;
  kill_switch: boolean; // halts all proposals
};
export const DEFAULT_LIMITS: Limits = {
  max_single_asset_pct: 25,
  max_class_pct: { crypto: 20, equity: 80, option: 5, cash: 100 },
  max_portfolio_vol_pct: 25,
  max_drawdown_pct: 20,
  kill_switch: false,
};
export type Targets = { risk_level: "low" | "medium" | "high"; cash_floor_pct: number };
export const DEFAULT_TARGETS: Targets = { risk_level: "medium", cash_floor_pct: 10 };

// ---------- Shared state (Redis-compatible) ----------
export interface SharedStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSec?: number): Promise<void>;
  readonly backend: "upstash" | "memory";
}
export class MemoryStore implements SharedStore {
  readonly backend = "memory" as const;
  private m = new Map<string, { v: string; exp: number }>();
  get(k: string) {
    const e = this.m.get(k);
    if (!e || (e.exp && e.exp < Date.now())) return Promise.resolve(null);
    return Promise.resolve(e.v);
  }
  set(k: string, v: string, ttl?: number) {
    this.m.set(k, { v, exp: ttl ? Date.now() + ttl * 1000 : 0 });
    return Promise.resolve();
  }
}
/** Upstash Redis REST (free tier). Never logs the token. */
export class UpstashStore implements SharedStore {
  readonly backend = "upstash" as const;
  constructor(private url: string, private token: string, private f: typeof fetch = fetch) {}
  private async cmd(args: string[]) {
    const r = await this.f(this.url, { method: "POST", headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    if (!r.ok) throw new Error(`redis ${r.status}`);
    return (await r.json())?.result ?? null;
  }
  async get(k: string) { return (await this.cmd(["GET", k])) as string | null; }
  async set(k: string, v: string, ttl?: number) { await this.cmd(ttl ? ["SET", k, v, "EX", String(ttl)] : ["SET", k, v]); }
}
export function sharedStore(env: (k: string) => string | undefined = (k) => Deno.env.get(k)): SharedStore {
  const url = env("UPSTASH_REDIS_REST_URL"), token = env("UPSTASH_REDIS_REST_TOKEN");
  return url && token ? new UpstashStore(url, token) : new MemoryStore();
}
/** Reads limits/targets for a user; falls back to safe defaults on any error. */
export async function loadRiskConfig(store: SharedStore, userId: string): Promise<{ limits: Limits; targets: Targets; backend: string }> {
  const parse = async <T>(k: string, d: T): Promise<T> => {
    try {
      const raw = await store.get(k);
      return raw ? { ...d, ...JSON.parse(raw) } : d;
    } catch {
      return d;
    }
  };
  return { limits: await parse(`exo:limits:${userId}`, DEFAULT_LIMITS), targets: await parse(`exo:targets:${userId}`, DEFAULT_TARGETS), backend: store.backend };
}

// ---------- Quant engine (fast path) ----------
export type QuantParams = { lookback_sigma: number; vol_target_pct: number; max_leverage: number };
export const PARAM_BOUNDS = { vol_target_pct: [5, 40], max_leverage: [0, 1], lookback_sigma: [0.5, 3] } as const;
/** AI proposes parameters; hard bounds clamp them (leverage capped at 1 = no leverage). */
export function clampParams(p: Partial<QuantParams>): QuantParams {
  const c = (v: unknown, [lo, hi]: readonly [number, number], d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  return {
    vol_target_pct: c(p.vol_target_pct, PARAM_BOUNDS.vol_target_pct, 15),
    max_leverage: c(p.max_leverage, PARAM_BOUNDS.max_leverage, 1),
    lookback_sigma: c(p.lookback_sigma, PARAM_BOUNDS.lookback_sigma, 1.5),
  };
}
/** Typical annualised vol by class when no history is available (labelled as an assumption). */
export const ASSUMED_VOL: Record<AssetClass, number> = { crypto: 65, equity: 22, option: 90, cash: 0 };

/** Deterministic signal from a live quote: 24h move vs assumed daily vol → z-score, regime, vol-target size. */
export function quantSignal(sym: string, quote: { price: number; changePct: number } | undefined, cls: AssetClass, params: QuantParams) {
  if (!quote || !Number.isFinite(quote.price) || quote.price <= 0) return { symbol: sym, flag: "missing_data" as const, note: "no live price; no signal" };
  const annVol = ASSUMED_VOL[cls];
  const dailyVol = annVol / Math.sqrt(365);
  const z = dailyVol ? quote.changePct / dailyVol : 0;
  const regime = Math.abs(z) < params.lookback_sigma ? "normal" : z > 0 ? "stretched_up" : "stretched_down";
  const size = annVol ? Math.min(params.max_leverage, params.vol_target_pct / annVol) : 1;
  return {
    symbol: sym, price: quote.price, change_24h_percent: Math.round(quote.changePct * 100) / 100, z_score: Math.round(z * 100) / 100, regime,
    vol_target_weight: Math.round(size * 1000) / 1000,
    assumptions: { annual_vol_percent: annVol, source: "assumed class volatility (no tick history in Phase 1)" },
    paper_only: true,
  };
}

// ---------- Macro advisory engine (slow path) ----------
export const PRIVATE_EQUITY_STUB = { status: "stub", note: "Private-equity marks/deal data not connected in Phase 1." } as const;
/** Turns FRED macro facts into a risk posture the Governor can use. Pure. */
export function macroPosture(m: { fed_funds?: number | null; yield_curve_10y_2y?: number | null; cpi_yoy?: number | null; unemployment?: number | null }) {
  const notes: string[] = [];
  let score = 0; // positive = risk-on
  if (typeof m.yield_curve_10y_2y === "number") { if (m.yield_curve_10y_2y < 0) { score--; notes.push("inverted curve"); } else score++; }
  if (typeof m.cpi_yoy === "number") { if (m.cpi_yoy > 3.5) { score--; notes.push("hot inflation"); } else if (m.cpi_yoy < 2.5) score++; }
  if (typeof m.unemployment === "number" && m.unemployment > 5) { score--; notes.push("weak labour market"); }
  const known = [m.yield_curve_10y_2y, m.cpi_yoy, m.unemployment].filter((x) => typeof x === "number").length;
  if (!known) return { posture: "unknown" as const, flag: "missing_data" as const, notes: ["macro data unavailable"] };
  return { posture: score > 0 ? "risk_on" as const : score < 0 ? "risk_off" as const : "neutral" as const, score, notes };
}

// ---------- Governor (cross-asset risk) ----------
export type Position = { symbol: string; cls: AssetClass; weight_pct: number };
export function governor(proposal: Position[], limits: Limits, opts: { posture?: string; current_drawdown_pct?: number } = {}) {
  const issues: string[] = [];
  if (limits.kill_switch) return { decision: "block" as const, issues: ["kill switch on"], adjusted: [] as Position[], paper_only: true };
  const clean = proposal.filter((p) => Number.isFinite(p.weight_pct) && p.weight_pct >= 0);
  if (clean.length !== proposal.length) issues.push("dropped positions with invalid weights");
  const total = clean.reduce((s, p) => s + p.weight_pct, 0);
  if (total > 100.01) issues.push(`weights sum to ${Math.round(total * 100) / 100}% (> 100%, leverage not allowed)`);
  if ((opts.current_drawdown_pct ?? 0) >= limits.max_drawdown_pct) return { decision: "block" as const, issues: [...issues, "max drawdown reached"], adjusted: [] as Position[], paper_only: true };
  // Risk-off macro halves the class caps for crypto and options.
  const caps = { ...limits.max_class_pct };
  if (opts.posture === "risk_off") { caps.crypto /= 2; caps.option /= 2; }
  let adjusted = clean.map((p) => ({ ...p, weight_pct: Math.min(p.weight_pct, p.cls === "cash" ? 100 : limits.max_single_asset_pct) }));
  adjusted.forEach((p, i) => p.weight_pct < clean[i].weight_pct && issues.push(`${p.symbol} capped at ${limits.max_single_asset_pct}%`));
  for (const cls of Object.keys(caps) as AssetClass[]) {
    const inCls = adjusted.filter((p) => p.cls === cls), sum = inCls.reduce((s, p) => s + p.weight_pct, 0);
    if (sum > caps[cls]) {
      const k = caps[cls] / sum;
      inCls.forEach((p) => (p.weight_pct *= k));
      issues.push(`${cls} scaled to ${caps[cls]}%`);
    }
  }
  const sum = adjusted.reduce((s, p) => s + p.weight_pct, 0);
  if (sum > 100) adjusted = adjusted.map((p) => ({ ...p, weight_pct: (p.weight_pct * 100) / sum }));
  // Rough portfolio vol with assumed class vols and 0.3 correlation.
  const w = adjusted.map((p) => (p.weight_pct / 100) * ASSUMED_VOL[p.cls]);
  const vol = Math.sqrt(w.reduce((s, a, i) => s + w.reduce((t, b, j) => t + a * b * (i === j ? 1 : 0.3), 0), 0));
  if (vol > limits.max_portfolio_vol_pct) {
    const k = limits.max_portfolio_vol_pct / vol;
    adjusted = adjusted.map((p) => (p.cls === "cash" ? p : { ...p, weight_pct: p.weight_pct * k }));
    issues.push(`scaled risk assets to target ${limits.max_portfolio_vol_pct}% vol`);
  }
  adjusted = adjusted.map((p) => ({ ...p, weight_pct: Math.round(p.weight_pct * 100) / 100 }));
  const decision = issues.length ? "scale_down" as const : "approve" as const;
  return { decision, issues, adjusted, est_portfolio_vol_percent: Math.round(Math.min(vol, limits.max_portfolio_vol_pct) * 100) / 100, paper_only: true };
}
