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
   ├─ Governor         governor_check, macro_posture, quant_signal (risk / rebalance / allocation)
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
| `engines.ts` | Dual-Engine: Quant fast path (`quant_signal`, clamped AI params), Macro engine (`macro_posture`), shared Redis/memory limits, Governor (`governor_check`) | live (paper only) |
| `QUANT_STUBS` in `quant.ts` | Interfaces for S&P Capital IQ, Daloopa, native Rust/C++ engine, LSTM forecasts | stub, not called |

## Dual-Engine architecture (`engines.ts`)

Two engines share one set of targets and limits, and a Governor sits over both. Phase 1 uses only free services and is **paper only**: nothing in the codebase can place an order or move money.

```
            ┌──────────── shared targets & limits ────────────┐
            │  Upstash Redis REST (free tier) if               │
            │  UPSTASH_REDIS_REST_URL/TOKEN are set,           │
            │  else in-memory; safe defaults on any error      │
            │  keys: exo:limits:<user>, exo:targets:<user>     │
            └───────▲───────────────────────────────▲─────────┘
                    │                               │
  Quant Engine (fast path)                 Macro Advisory Engine (slow path)
  crypto / equities / options              FRED (rates, curve, CPI, jobs) live
  free feeds: market-data fn quotes        SEC EDGAR fundamentals live
  quant_signal: z-score, regime,           macro_posture: risk_on / neutral /
  vol-target weight                        risk_off with reasons
  quant_monte_carlo / allocation /         private equity: stub
  black_scholes
  AI = risk/parameter controller:
  proposes params → clampParams
  (vol target 5-40%, leverage ≤ 1)
                    │                               │
                    └──────────► Governor ◄─────────┘
             governor_check(proposed paper allocation):
             kill switch → block · drawdown ≥ limit → block
             single-asset cap · class caps (crypto 20%, options 5%)
             risk_off halves crypto/option caps · portfolio vol target
             → approve | scale_down (adjusted weights) | block
```

| Piece | Phase 1 | Later |
| --- | --- | --- |
| Quant feeds | Live quotes from the existing `market-data` function (price + 24h change); class-level assumed volatility, labelled as an assumption | Tick/WebSocket feeds (e.g. exchange public streams), real realised vol, compiled Rust/C++ engine |
| Options | Black-Scholes pricing + greeks | Chains, implied vol surface |
| Macro | FRED + SEC live; private equity stub | Paid S&P / Daloopa, PE marks |
| Shared state | Upstash Redis REST or memory; read-only from Exo | Admin UI to edit limits; engines write targets |
| Governor | Deterministic checks on proposals | Human approval required before any execution feature exists |

The model never sees credentials. Redis is optional, and without it the safe `DEFAULT_LIMITS` apply. Edge functions run statelessly, so the "ultra-low latency" path is the deterministic tool code itself (microseconds), with no model calls inside it. A real streaming engine is a later, separate service.

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
