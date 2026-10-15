import { assert, assertEquals } from "jsr:@std/assert@1";
import { clampParams, DEFAULT_LIMITS, governor, loadRiskConfig, macroPosture, MemoryStore, quantSignal, sharedStore, UpstashStore } from "./engines.ts";
import { route } from "./orchestrator.ts";

Deno.test("AI parameters are clamped by hard bounds (no leverage)", () => {
  const p = clampParams({ vol_target_pct: 500, max_leverage: 3, lookback_sigma: NaN });
  assertEquals(p, { vol_target_pct: 40, max_leverage: 1, lookback_sigma: 1.5 });
});
Deno.test("quant signal: z-score/regime, missing price flagged, paper only", () => {
  const s = quantSignal("BTC", { price: 60000, changePct: 8 }, "crypto", clampParams({})) as { regime: string; paper_only: boolean };
  assertEquals(s.regime, "stretched_up");
  assert(s.paper_only);
  assertEquals((quantSignal("X", undefined, "equity", clampParams({})) as { flag: string }).flag, "missing_data");
});
Deno.test("macro posture from FRED inputs; unknown when data missing", () => {
  assertEquals(macroPosture({ yield_curve_10y_2y: -0.4, cpi_yoy: 4.1, unemployment: 4 }).posture, "risk_off");
  assertEquals(macroPosture({ yield_curve_10y_2y: 0.5, cpi_yoy: 2.1, unemployment: 4 }).posture, "risk_on");
  assertEquals(macroPosture({}).posture, "unknown");
});
Deno.test("governor: caps concentration and crypto, tighter in risk-off, blocks on kill switch/drawdown", () => {
  const prop = [{ symbol: "BTC", cls: "crypto" as const, weight_pct: 40 }, { symbol: "SPY", cls: "equity" as const, weight_pct: 50 }, { symbol: "CASH", cls: "cash" as const, weight_pct: 10 }];
  const g = governor(prop, DEFAULT_LIMITS);
  assertEquals(g.decision, "scale_down");
  const btc = g.adjusted.find((p) => p.symbol === "BTC")!.weight_pct;
  assert(btc <= 20);
  const off = governor(prop, DEFAULT_LIMITS, { posture: "risk_off" });
  assert(off.adjusted.find((p) => p.symbol === "BTC")!.weight_pct <= 10);
  assertEquals(governor(prop, { ...DEFAULT_LIMITS, kill_switch: true }).decision, "block");
  assertEquals(governor(prop, DEFAULT_LIMITS, { current_drawdown_pct: 25 }).decision, "block");
  assertEquals(governor([{ symbol: "SPY", cls: "equity", weight_pct: 20 }, { symbol: "CASH", cls: "cash", weight_pct: 80 }], DEFAULT_LIMITS).decision, "approve");
  assert(governor(prop, DEFAULT_LIMITS).paper_only);
});
Deno.test("shared store: memory default, Upstash when configured, safe defaults on errors", async () => {
  assertEquals(sharedStore(() => undefined).backend, "memory");
  assertEquals(sharedStore((k) => (k.startsWith("UPSTASH") ? "x" : undefined)).backend, "upstash");
  const m = new MemoryStore();
  await m.set("exo:limits:u1", JSON.stringify({ max_single_asset_pct: 10 }));
  const cfg = await loadRiskConfig(m, "u1");
  assertEquals(cfg.limits.max_single_asset_pct, 10);
  assertEquals(cfg.limits.max_class_pct.crypto, 20);
  const broken = new UpstashStore("https://r", "t", () => Promise.reject(new Error("down")));
  assertEquals((await loadRiskConfig(broken, "u1")).limits, DEFAULT_LIMITS);
});
Deno.test("governor joins risk/rebalance questions", () => {
  assert(route("rebalance my portfolio to lower risk", "money").agents.includes("governor"));
});
