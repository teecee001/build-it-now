import { assert, assertEquals } from "jsr:@std/assert@1";
import { type CallResult, runAgent } from "./agent.ts";
import { unsupportedFigures } from "./factcheck.ts";
import { evalArithmetic, runTool } from "./tools.ts";
import { accountSummary, type AccountData } from "./rules.ts";

const account: AccountData = {
  name: "Alex Rivera",
  wallets: [{ currency: "USD", balance: 24, savings_balance: 0 }],
  transactions: [{ amount: 2, currency: "USD", type: "send", status: "completed", created_at: new Date().toISOString() }],
  bills: [], crypto: [], stocks: [],
  cryptoQuotes: { BTC: { price: 83446, changePct: 1.07 } }, stockQuotes: {},
};
const ok = (message: Record<string, unknown>): CallResult => ({ ok: true, status: 200, json: { choices: [{ message }] } });
const tc = (id: string, name: string, args: unknown) => ({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });
const base = { messages: [{ role: "user", content: "How can I grow my savings?" }], evidence: [accountSummary(account)] };

Deno.test("tool loop: calls tools then answers with verified figures", async () => {
  const bodies: Record<string, unknown>[] = [];
  const script = [
    ok({ role: "assistant", content: null, tool_calls: [tc("1", "get_savings", {}), tc("2", "calculate", { op: "compound_savings", principal: 24, monthly: 25, years: 1 })] }),
  ];
  const call = async (b: Record<string, unknown>) => {
    bodies.push(structuredClone(b));
    if (script.length) return script.shift()!;
    const tool = (b.messages as { role: string; content: string }[]).filter((m) => m.role === "tool").map((m) => JSON.parse(m.content));
    const fv = tool.find((t) => t.future_value).future_value;
    return ok({ role: "assistant", content: `Your account shows $24.00 available at 6% APY. Adding $25 a month gives about $${fv} in a year.` });
  };
  const r = await runAgent({ call, ctx: { account }, ...base });
  assertEquals(r.kind, "answer");
  if (r.kind !== "answer") return;
  assertEquals(r.toolsUsed, ["get_savings", "calculate"]);
  assertEquals(r.factcheck, "pass");
  assert(Array.isArray(bodies[0].tools));
});

Deno.test("fact-check: unsupported figure triggers one repair", async () => {
  let n = 0;
  const call = async () => ++n === 1
    ? ok({ role: "assistant", content: "You'll have $9,999 next year with 12% growth." })
    : ok({ role: "assistant", content: "Your account shows $24.00 available, earning 6% APY." });
  const r = await runAgent({ call, ctx: { account }, ...base });
  assertEquals(r.kind, "answer");
  if (r.kind === "answer") assertEquals(r.factcheck, "repaired");
});

Deno.test("fact-check: still wrong after repair -> factcheck_failed", async () => {
  const call = async () => ok({ role: "assistant", content: "About $5,000 soon." });
  const r = await runAgent({ call, ctx: { account }, ...base });
  assertEquals(r.kind, "factcheck_failed");
});

Deno.test("provider rejects tools -> context injection", async () => {
  const bodies: Record<string, unknown>[] = [];
  const call = async (b: Record<string, unknown>) => {
    bodies.push(b);
    return b.tools ? { ok: false, status: 400, text: "tools are not supported for this model" } : ok({ role: "assistant", content: "BTC is $83,446 (+1.07%)." });
  };
  const r = await runAgent({ call, ctx: { account }, ...base });
  assertEquals(r.kind, "answer");
  if (r.kind === "answer") assertEquals(r.mode, "context");
  assert(!bodies[1].tools);
});

Deno.test("loop stops after 4 tool rounds", async () => {
  let calls = 0;
  const call = async (b: Record<string, unknown>) => {
    calls++;
    if (b.tool_choice === "none") return ok({ role: "assistant", content: "Your account shows $24.00." });
    return ok({ role: "assistant", content: null, tool_calls: [tc(String(calls), "get_balances", {})] });
  };
  const r = await runAgent({ call, ctx: { account }, ...base });
  assertEquals(r.kind, "answer");
  assertEquals(calls, 5);
});

Deno.test("http error is reported", async () => {
  const r = await runAgent({ call: async () => ({ ok: false, status: 503, text: "overloaded" }), ctx: { account }, ...base });
  assertEquals(r.kind, "http_error");
});

Deno.test("goals tools only offered when table exists; work through db", async () => {
  const rows: unknown[] = [];
  const goals = { list: async () => ({ data: rows, error: null }), insert: async (row: unknown) => (rows.push(row), { data: row, error: null }) };
  await runTool("set_goal", { goal: "Emergency fund", target_amount: 500, target_date: "2027-06-01" }, { account, goals });
  const listed = await runTool("list_goals", {}, { account, goals }) as { goals: unknown[] };
  assertEquals(listed.goals.length, 1);
  const missing = await runTool("list_goals", {}, { account }) as { error: string };
  assert(missing.error);
});

Deno.test("calculate + factcheck helpers", async () => {
  assertEquals(evalArithmetic("(24+25*12)/2"), 162);
  const c = await runTool("calculate", { op: "budget_50_30_20", income: 100 }, { account }) as { savings: number };
  assertEquals(c.savings, 20);
  const conv = await runTool("calculate", { op: "convert", amount: 1000, from: "USD", to: "BTC" }, { account }) as { result: number };
  assert(Math.abs(conv.result - 1000 / 83446) < 1e-9);
  assertEquals(unsupportedFigures("BTC at $83.4k, about $83,446 and 6% APY", ["83446", "6"]).length, 0);
  assertEquals(unsupportedFigures("$12,345", ["24"]).map((f) => f.raw), ["$12,345"]);
});

Deno.test("set_goal never saves a past date", async () => {
  const saved: { target_date: string | null }[] = [];
  const goals = { list: async () => ({ data: saved, error: null }), insert: async (row: { target_date: string | null }) => (saved.push(row), { data: row, error: null }) };
  const now = new Date("2026-10-13T12:00:00Z");
  await runTool("set_goal", { goal: "Save $500", target_amount: 500, target_date: "2024-12-31" }, { account: { ...account, now }, goals });
  await runTool("set_goal", { goal: "x", target_date: "2026-03-01" }, { account: { ...account, now }, goals });
  assertEquals(saved.map((r) => r.target_date), ["2026-12-31", "2027-03-01"]);
});
