import { assert, assertEquals } from "jsr:@std/assert";
import { enforceBrevity } from "./brevity.ts";

const essay = `## Why risk matters\nA good portfolio risk strategy builds in circuit breakers. It stops panic selling. Markets get noisy.\n\n**How to start:**\n1. **Run an Accounting Check:** I will look at your assets. Then liabilities.\n2. **Proposed Rebalance:** We tune weights.`;
Deno.test("caps a long essay to 4 plain sentences with no headings", () => {
  const out = enforceBrevity(essay, "how should I think about risk?");
  assert(!out.includes("#") && !out.includes("**") && !/^\d\./m.test(out));
  assertEquals(out.match(/[.!?](\s|$)/g)?.length, 4);
});
Deno.test("keeps detail when asked and keeps card lines", () => {
  assertEquals(enforceBrevity(essay, "explain in detail"), essay);
  const gov = "The Governor rebalanced. Volatility is fine.\n\n- BTC: 20% (cap)\n- SPY: 50%\n- Cash: 30%";
  assert(enforceBrevity(gov, "rebalance me").includes("- SPY: 50%"));
});
