// Lead Orchestrator: routes each question to specialist agents and shares one per-request
// blackboard (tool-result cache + findings). Routing is deterministic (no extra model call),
// so it's free and testable. Specialists reuse the same agent loop, fact-check and tools.
export type Mode = "money" | "life";
export type AgentId = "bull" | "bear" | "quant" | "wealth" | "life" | "governor";

export const AGENTS: Record<AgentId, { name: string; tools: string[]; brief: string }> = {
  wealth: {
    name: "Wealth Advisor",
    tools: ["get_balances", "get_transactions", "get_bills", "get_savings", "calculate", "audit_finances", "accounting_check", "get_prices", "get_news", "get_macro", "get_market_sentiment", "set_goal", "list_goals", "delete_goal"],
    brief: "Personal finance: budgets, savings, goals, audits. Use accounting_check for any balance sheet or net-worth answer.",
  },
  quant: {
    name: "Quant",
    tools: ["calculate", "quant_monte_carlo", "quant_allocation", "quant_black_scholes", "quant_signal", "get_prices", "get_balances", "get_macro"],
    brief: "Numbers only: simulations, allocation, option pricing. State assumptions (mu, sigma, correlation). Never invent prices; if a price tool returns null say it's not available.",
  },
  bull: {
    name: "Bull",
    tools: ["get_news", "get_company_fundamentals", "get_prices", "get_market_sentiment", "get_macro"],
    brief: "Make the strongest evidence-based bull case in 3 bullets, citing tool data only.",
  },
  bear: {
    name: "Bear",
    tools: ["get_news", "get_company_fundamentals", "get_prices", "get_market_sentiment", "get_macro"],
    brief: "Make the strongest evidence-based bear case in 3 bullets (risks, valuation, macro), citing tool data only.",
  },
  governor: {
    name: "Governor",
    tools: ["governor_check", "macro_posture", "quant_signal", "get_balances", "get_prices", "accounting_check"],
    brief: "Cross-asset risk officer. Check any proposed allocation or rebalance with governor_check before endorsing it; report approve / scale down / block and why. Paper only; you cannot trade.",
  },
  life: {
    name: "Life Assistant",
    tools: ["shop_search", "plan_trip", "plan_event", "maps_link", "calculate", "get_balances", "get_savings"],
    brief: "Everyday life: shopping, trips, events, places. Use shop_search for products (never invent prices), plan_trip / plan_event for plans (reply day-by-day like a calendar), maps_link for places.",
  },
};

const has = (q: string, re: RegExp) => re.test(q.toLowerCase());

/** Which specialists handle this turn. "debate" means Bull+Bear run in parallel, then the Lead synthesises. */
export function route(question: string, mode: Mode): { agents: AgentId[]; debate: boolean } {
  const q = question || "";
  if (mode === "life") {
    const money = has(q, /\b(afford|budget|savings?|balance)\b/);
    return { agents: money ? ["life", "wealth"] : ["life"], debate: false };
  }
  const agents = new Set<AgentId>();
  const debate = has(q, /\b(should i (buy|sell|invest)|bull|bear|buy or sell|worth (buying|investing)|outlook|thesis|overvalued|undervalued)\b/);
  if (has(q, /monte carlo|simulat|probabilit|allocation|allocate|portfolio weights?|sharpe|black[- ]?scholes|option price|volatility|\bvar\b|risk of (losing|ruin)/)) agents.add("quant");
  if (debate) { agents.add("bull"); agents.add("bear"); }
  if (has(q, /\b(risk|exposure|limits?|rebalanc\w*|allocation|allocate|drawdown|hedge|concentrat\w*|macro)\b/)) agents.add("governor");
  if (!agents.size || has(q, /\b(my|i)\b/)) agents.add("wealth");
  return { agents: [...agents], debate };
}

/** Per-request shared memory: identical tool calls across agents run once. */
export class Blackboard {
  private cache = new Map<string, Promise<unknown>>();
  findings: { agent: string; text: string }[] = [];
  hits = 0;
  run(name: string, args: Record<string, unknown>, exec: () => Promise<unknown>) {
    // Writes are never cached.
    if (/^(set_goal|delete_goal)$/.test(name)) return exec();
    const key = `${name}:${JSON.stringify(args, Object.keys(args).sort())}`;
    if (this.cache.has(key)) { this.hits++; return this.cache.get(key)!; }
    const p = exec();
    this.cache.set(key, p);
    return p;
  }
}

/** Messenger style for every reply (shown as short chat bubbles; Sources shown by the app as cards). */
export const STYLE_RULES = [
  "Write like a messenger, not a report: 2-4 short sentences (under 90 words) unless the user asks for detail. No headings, no numbered or bulleted essays; plain sentences. Allocation rows, itinerary slots and product links may follow as short lines.",
  "Do not write a 'Sources' heading or list links at the end; cite inline like (Reuters, Oct 7). The app shows sources as cards.",
  "If a tool flags missing_data or a price is null, say it's not available. Never estimate or invent prices.",
].join("\n");

export const LIFE_RULES = [
  "You are Exo in Life mode: a warm personal assistant for shopping, trips, events, places and everyday plans. Bring in money only when the user asks (e.g. can I afford it).",
  "For products call shop_search and share 2-4 options with links; mention prices only if the tool returned them.",
  "For trips/events call plan_trip / plan_event and reply calendar-style: one line per day or slot, like '**Sat, Nov 8** · Morning: …'. Include the map or calendar link.",
].join("\n");

export function agentSystem(id: AgentId) {
  const a = AGENTS[id];
  return `You are the ${a.name} agent inside Exo. ${a.brief}`;
}

export function leadSynthesis(findings: { agent: string; text: string }[]) {
  return `You are Exo's Lead Orchestrator. Specialist findings for this question (verified tool data only):\n${
    findings.map((f) => `### ${f.agent}\n${f.text}`).join("\n\n")
  }\n\nGive the user one balanced answer: the bull case, the bear case, and what the numbers say, in short bubbles. Not financial advice.`;
}
