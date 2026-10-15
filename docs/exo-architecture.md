# Exo architecture (Phase 1)

Exo is ExoSky's money + life intelligence, delivered as a messenger on web (`src/pages/AIAdvisor.tsx`) and mobile (`mobile/src/app/exo.tsx`). One Supabase edge function, `ai-advisor`, runs it. The request contract is backward compatible: `POST { messages: {role, content}[], timezone?, mode?: "money" | "life" }` returns an OpenAI-style SSE stream.

```
 client (web / mobile)
   │  messages + mode
   ▼
 ai-advisor ── auth (user JWT) ── loadAccount (RLS, user's own rows) ── live quotes
   │
   ▼
 Lead Orchestrator (orchestrator.ts)           deterministic router, no extra model call
   ├─ Wealth Advisor   balances, bills, audit_finances, accounting_check, goals, macro/news
   ├─ Quant            quant_monte_carlo, quant_allocation, quant_black_scholes, calculate, prices
   ├─ Bull  ┐ run in parallel for "should I buy / outlook / thesis" questions,
   ├─ Bear  ┘ then the Lead synthesises both cases + the numbers
   └─ Life Assistant   shop_search, plan_trip, plan_event, maps_link (+ wealth when "afford")
   │
   │  Blackboard: per-request shared memory. Identical tool reads across agents run once
   │  (cache hits reported in X-Exo-Cache-Hits); writes (set/delete goal) are never cached.
   ▼
 agent loop (agent.ts): tool calling on free providers first (Groq, Gemini), per-agent tool
 allow-list, 12 s tool timeout, 40 s request budget
   ▼
 fact-check (factcheck.ts): every $ / % figure must come from tool results or the account
 summary; one repair pass; otherwise a deterministic built-in answer
   ▼
 SSE answer (+ X-Exo-Agents, X-Exo-Mode, X-Exo-Tools, X-Exo-Factcheck headers)
```

## Modules

| File | Role | Status |
| --- | --- | --- |
| `orchestrator.ts` | Routing, agent briefs, Blackboard, style rules, Life rules, Lead synthesis | live in this PR |
| `quant.ts` | Seeded Monte Carlo (GBM), long-only mean-variance (max Sharpe), Black-Scholes + greeks. Inputs are validated; bad or missing inputs return `{ flag: "missing_data" }`, never NaN | live |
| `accounting.ts` | Personal balance sheet (assets = cash + savings + priced holdings; liabilities = unpaid bills), `checkBooks` (A = L + E, lines sum to totals, income − expenses = net), `selfCorrect` that recomputes from line items | live |
| `life.ts` | Free, keyless shopping search (Bing RSS, then DuckDuckGo HTML, then store links). Prices only when a listing shows one. Trip and event planners return calendar-style structures with Google Maps and Calendar links | live |
| `tools.ts` | Tool schemas + execution. `get_prices` returns `{ usd: null, flag: "missing_data" }` for unknown symbols | live |
| `QUANT_STUBS` in `quant.ts` | Interfaces for S&P Capital IQ, Daloopa, native Rust/C++ engine, LSTM forecasts | stub, not called |

## Guardrails

- No invented prices or figures: the fact-check plus `missing_data` flags; the prompt tells agents to say "not available".
- Read-only: no trade execution, no money movement. The only write is the user-requested goal save/delete that already existed.
- Account data is read with the user's own JWT (RLS), never the service role.
- Money mode keeps the "Not financial advice" note.

## Messenger behaviour (clients)

- **Modes:** Exo Money / Exo Life switch, saved per device (`exo-mode:v1`). History is shared across modes.
- **Short bubbles:** replies are split into up to 4 bubbles at paragraph breaks. Lists, tables and headings stay with their lead-in.
- **Sources as cards only:** the raw "Sources" list is stripped from the text, and links render as preview cards on the last bubble.
- **Streaming:** web renders deltas into a live bubble as they arrive; mobile (no fetch streaming in React Native) reveals the bubbles one by one with the typing indicator in between.
- **Ticks:** a single tick when sent, a double tick when Exo starts replying.
- **Header:** just `online` / `typing...`.
- **Follow-up chips:** generated from the last reply and the current mode.
- **No splash:** an empty chat opens with a greeting bubble from Exo.

## Tests

- `supabase/functions/ai-advisor/orchestra.test.ts` (Deno) covers:
  - quant maths, including the Black-Scholes textbook value and put-call parity;
  - the accounting checks and self-correction;
  - routing, Blackboard caching and agent tool subsets;
  - Life parsing and its fallbacks.
- `mobile/src/__tests__/exoThreads.test.ts` (Jest) covers threads, sources stripping, bubble splitting and follow-up chips.

## Next phases

- Paid data (S&P, Daloopa), a native compute engine and ML forecasts plug in behind `QUANT_STUBS`.
- Human-in-the-loop approvals will be required before any money-moving tool exists.
