import { assert, assertEquals } from "jsr:@std/assert@1";
import { blackScholes, meanVariance, monteCarlo } from "./quant.ts";
import { balanceSheet, checkBooks, selfCorrect } from "./accounting.ts";
import { parseDdg, planEvent, planTrip, shopSearch } from "./life.ts";
import { Blackboard, route } from "./orchestrator.ts";
import { runTool, toolDefs } from "./tools.ts";
import type { AccountData } from "./rules.ts";

const account: AccountData = {
  name: "Alex", wallets: [{ currency: "USD", balance: 7, savings_balance: 10 }], transactions: [],
  bills: [{ biller_name: "Phone", amount: 5, category: "utilities", due_date: "2026-11-01", is_paid: false }],
  crypto: [{ code: "BTC", amount: 0.001 }, { code: "ZZZ", amount: 3 }], stocks: [],
  cryptoQuotes: { BTC: { price: 60000, changePct: 1 } }, stockQuotes: {}, now: new Date("2026-10-15T12:00:00Z"), timeZone: "UTC",
};

Deno.test("black-scholes matches the textbook value", () => {
  const r = blackScholes({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2 }) as { price: number };
  assert(Math.abs(r.price - 10.4506) < 0.01);
  const put = blackScholes({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2, type: "put" }) as { price: number };
  assert(Math.abs(put.price - 5.5735) < 0.01); // put-call parity
});
Deno.test("quant tools flag missing data instead of NaN", () => {
  assertEquals((blackScholes({ S: NaN, K: 1, T: 1, r: 0, sigma: 0.2 }) as { flag: string }).flag, "missing_data");
  assertEquals((monteCarlo({ principal: 1000, years: NaN, mu: 0.07, sigma: 0.15 }) as { flag: string }).flag, "missing_data");
  assertEquals((meanVariance([{ symbol: "A", mu: 0.1, sigma: 0.2 }]) as { flag: string }).flag, "missing_data");
});
Deno.test("monte carlo is reproducible and ordered", () => {
  const a = monteCarlo({ principal: 1000, monthly: 100, years: 5, mu: 0.07, sigma: 0.15 }) as { p10: number; p50: number; p90: number };
  const b = monteCarlo({ principal: 1000, monthly: 100, years: 5, mu: 0.07, sigma: 0.15 }) as { p50: number };
  assertEquals(a.p50, b.p50);
  assert(a.p10 < a.p50 && a.p50 < a.p90);
});
Deno.test("mean-variance weights are long-only and sum to 1", () => {
  const r = meanVariance([{ symbol: "SPY", mu: 0.08, sigma: 0.16 }, { symbol: "BND", mu: 0.045, sigma: 0.06 }, { symbol: "BTC", mu: 0.2, sigma: 0.7 }]) as { weights: Record<string, number> };
  const w = Object.values(r.weights);
  assert(w.every((x) => x >= 0));
  assert(Math.abs(w.reduce((s, x) => s + x, 0) - 1) < 0.001);
});
Deno.test("accounting: A = L + E holds and unpriced holdings are flagged", () => {
  const s = balanceSheet(account);
  assertEquals(s.assets.total, 77); // 7 + 10 + 60
  assertEquals(s.liabilities.total, 5);
  assertEquals(s.equity, 72);
  assert(checkBooks(s).ok);
  assert(s.flagged.some((f) => f.startsWith("ZZZ")));
});
Deno.test("accounting: broken maths is rejected and self-corrected", () => {
  const bad = { assets: { cash: 7, savings: 10, investments: 60, total: 90 }, liabilities: { unpaid_bills: 5, total: 5 }, equity: 80 };
  const c = checkBooks(bad, { total_income: 100, total_expenses: 40, net_cash_flow: 50 });
  assert(!c.ok);
  assert(c.issues.includes("assets != liabilities + equity"));
  assert(c.issues.includes("income - expenses != net cash flow"));
  const fx = selfCorrect(bad);
  assert(fx.corrected && fx.check.ok);
  assertEquals(fx.sheet.equity, 72);
});
Deno.test("accounting_check tool returns a passing check", async () => {
  const r = await runTool("accounting_check", {}, { account }) as { check: { ok: boolean } };
  assert(r.check.ok);
});
Deno.test("get_prices flags a missing price instead of guessing", async () => {
  const r = await runTool("get_prices", { symbols: ["BTC", "NOPE"] }, { account }) as Record<string, { usd: number | null; flag?: string }>;
  assertEquals(r.BTC.usd, 60000);
  assertEquals(r.NOPE.usd, null);
  assertEquals(r.NOPE.flag, "missing_data");
});
Deno.test("routing: modes and specialists", () => {
  assertEquals(route("find me running shoes", "life").agents, ["life"]);
  assertEquals(route("can I afford a new laptop with my savings", "life").agents, ["life", "wealth"]);
  const d = route("Should I buy NVDA now?", "money");
  assert(d.debate && d.agents.includes("bull") && d.agents.includes("bear"));
  assert(route("run a monte carlo on my portfolio", "money").agents.includes("quant"));
  assertEquals(route("how are my savings doing", "money").agents, ["wealth"]);
});
Deno.test("blackboard caches identical reads, never writes", async () => {
  const b = new Blackboard();
  let n = 0;
  const exec = () => Promise.resolve(++n);
  await b.run("get_news", { query: "x" }, exec);
  await b.run("get_news", { query: "x" }, exec);
  await b.run("set_goal", { goal: "a" }, exec);
  await b.run("set_goal", { goal: "a" }, exec);
  assertEquals(n, 3);
  assertEquals(b.hits, 1);
});
Deno.test("agent tool subsets", () => {
  const names = toolDefs(false, ["shop_search", "plan_trip"]).map((d) => d.function.name);
  assertEquals(names, ["shop_search", "plan_trip"]);
});
Deno.test("life: ddg parsing, links-only fallback, plans never in the past", async () => {
  const html = `<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fshop.example.com%2Fshoe&rut=x">Trail Shoe &amp; More</a><a class="result__snippet" href="#">Now $89.99 free shipping</a>`;
  const r = parseDdg(html);
  assertEquals(r[0].url, "https://shop.example.com/shoe");
  assertEquals(r[0].price, "$89.99");
  const off = await shopSearch("shoes", () => Promise.reject(new Error("offline")));
  assertEquals(off.source, "links-only");
  assertEquals(off.stores?.length, 4);
  const t = planTrip({ destination: "Lisbon", start_date: "2020-01-01", days: 3, today: "2026-10-15" });
  assert((t.start_date ?? "") >= "2026-10-15" && t.itinerary?.length === 3);
  const e = planEvent({ title: "Dinner", location: "Nobu Malibu", today: "2026-10-15" });
  assert(!!e.missing?.includes("date") && !!e.map);
});
