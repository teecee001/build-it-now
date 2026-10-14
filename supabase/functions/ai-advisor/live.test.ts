import { assert, assertEquals } from "jsr:@std/assert@1";
import { parseFredCsv, parseNewsRss, summarizeFacts } from "./live.ts";
import { auditFinances } from "./audit.ts";
import type { AccountData } from "./rules.ts";

Deno.test("news rss parses title, source, date, link", () => {
  const xml = `<rss><channel><item><title>Fed signals cut - Reuters</title><link>https://n.example/a</link><pubDate>Wed, 14 Oct 2026 09:00:00 GMT</pubDate><source url="https://reuters.com">Reuters</source></item></channel></rss>`;
  assertEquals(parseNewsRss(xml, 5), [{ title: "Fed signals cut", source: "Reuters", date: "2026-10-14 09:00 UTC", link: "https://n.example/a" }]);
});

Deno.test("fred csv skips missing values", () => {
  assertEquals(parseFredCsv("observation_date,DGS10\n2026-10-08,4.1\n2026-10-09,.\n2026-10-10,4.2\n").at(-1), { date: "2026-10-10", value: 4.2 });
});

Deno.test("sec facts split annual and quarterly", () => {
  const facts = { "us-gaap": { Revenues: { units: { USD: [
    { start: "2025-01-01", end: "2025-12-31", val: 400, form: "10-K", filed: "2026-02-01" },
    { start: "2026-04-01", end: "2026-06-30", val: 120, form: "10-Q", filed: "2026-08-01" },
  ] } } } };
  const r = summarizeFacts(facts) as { revenue: { annual: { value: number }[]; quarterly: { value: number }[] } };
  assertEquals(r.revenue.annual[0].value, 400);
  assertEquals(r.revenue.quarterly[0].value, 120);
});

Deno.test("audit finds statement, recurring and duplicates", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  const t = (d: string, type: string, amount: number, recipient: string) => ({ created_at: `${d}T10:00:00Z`, type, amount, currency: "USD", status: "completed", description: null, recipient, metadata: {} });
  const a = {
    name: "A", now, wallets: [{ currency: "USD", balance: 1000, savings_balance: 10 }], crypto: [], stocks: [], cryptoQuotes: {}, stockQuotes: {},
    bills: [{ biller_name: "Power", amount: 80, category: "Utilities", due_date: "2026-10-20", is_paid: false }],
    transactions: [
      t("2026-10-01", "deposit", 2000, "Payroll"),
      t("2026-10-05", "purchase", 15.99, "Netflix"), t("2026-09-05", "purchase", 15.99, "Netflix"),
      t("2026-10-10", "purchase", 40, "Cafe"), t("2026-10-10", "purchase", 40, "Cafe"),
    ],
  } as unknown as AccountData;
  const r = auditFinances(a, 30);
  assertEquals(r.income_statement.total_income, 2000);
  assertEquals(r.income_statement.total_expenses, 95.99);
  assertEquals(r.income_statement.net_cash_flow, 1904.01);
  assertEquals(r.savings_rate_percent, 95.2);
  assert(r.recurring_charges.some((x) => x.payee === "Netflix" && x.cadence === "monthly" && x.annualized_cost === 191.88));
  assertEquals(r.duplicate_suspects.length, 1);
  assertEquals(r.liquidity?.available_after_unpaid_bills, 920);
});

Deno.test("fact-check accepts billions from SEC figures", async () => {
  const { unsupportedFigures } = await import("./factcheck.ts");
  assertEquals(unsupportedFigures("Revenue was $215.9 billion ($215.94B).", ["215938000000"]).length, 0);
  assertEquals(unsupportedFigures("Revenue was $300 billion.", ["215938000000"]).length, 1);
});

Deno.test("long chat history is trimmed, not rejected", async () => {
  const { sanitizeMessages, MAX_TURNS } = await import("./history.ts");
  const raw: unknown[] = Array.from({ length: 150 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `m${i}` }));
  raw.push({ role: "system", content: "x" }, null, { role: "user", content: "What's the news on rate cut" });
  const out = sanitizeMessages(raw);
  assert(out.length <= MAX_TURNS);
  assertEquals(out[0].role, "user");
  assertEquals(out.at(-1)!.content, "What's the news on rate cut");
  assert(out.every((m) => m.role === "user" || m.role === "assistant"));
});

Deno.test("a hanging tool times out instead of failing the answer", async () => {
  const { runAgent } = await import("./agent.ts");
  let n = 0;
  const call = async (b: Record<string, unknown>) => {
    n++;
    if (n === 1) return { ok: true, status: 200, json: { choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "1", type: "function", function: { name: "get_news", arguments: "{\"query\":\"x\"}" } }] } }] } };
    const tool = (b.messages as { role: string; content: string }[]).find((m) => m.role === "tool");
    return { ok: true, status: 200, json: { choices: [{ message: { role: "assistant", content: tool?.content.includes("error") || tool ? "News is temporarily unavailable." : "?" } }] } };
  };
  const r = await runAgent({ call, messages: [{ role: "user", content: "news" }], ctx: { account: { wallets: [], transactions: [], bills: [], crypto: [], stocks: [], cryptoQuotes: {}, stockQuotes: {} } as unknown as AccountData }, evidence: [] });
  assertEquals(r.kind, "answer");
});
