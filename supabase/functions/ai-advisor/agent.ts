// Exo agent loop: OpenAI-compatible tool calling (Groq, Gemini, xAI, OpenAI), up to
// MAX_TOOL_ROUNDS rounds, then a fact-check of every $ / % figure with one repair pass.
import { unsupportedFigures } from "./factcheck.ts";
import { runTool, type ToolCtx, toolDefs } from "./tools.ts";

export const MAX_TOOL_ROUNDS = 5;

type Msg = Record<string, unknown>;
export type CallResult = { ok: boolean; status: number; json?: unknown; text?: string };
export type Caller = (body: Record<string, unknown>) => Promise<CallResult>;

export type AgentResult =
  | { kind: "answer"; text: string; toolsUsed: string[]; mode: "tools" | "context"; factcheck: "pass" | "repaired" }
  | { kind: "factcheck_failed"; toolsUsed: string[]; mode: "tools" | "context"; unsupported: string[] }
  | { kind: "http_error"; status: number; reason: string };

const stripThink = (s: string) => s.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

function firstMessage(json: unknown): Msg | null {
  const m = (json as { choices?: { message?: Msg }[] })?.choices?.[0]?.message;
  return m && typeof m === "object" ? m : null;
}

const looksLikeToolRejection = (status: number, text = "") =>
  (status === 400 || status === 422 || status === 404) && /tool|function/i.test(text);

export async function runAgent(opts: {
  call: Caller;
  messages: Msg[]; // system prompts + conversation
  ctx: ToolCtx;
  evidence: string[]; // account summary + user messages
}): Promise<AgentResult> {
  const { call, ctx } = opts;
  const evidence = [...opts.evidence];
  const toolsUsed: string[] = [];
  const tools = toolDefs(!!ctx.goals);
  let mode: "tools" | "context" = "tools";
  const convo: Msg[] = [...opts.messages];

  // Runs the model until it produces a final text answer (or errors).
  const complete = async (maxRounds: number): Promise<{ text: string } | { error: CallResult }> => {
    for (let round = 0; ; round++) {
      const useTools = mode === "tools";
      const body: Record<string, unknown> = { messages: convo, stream: false };
      if (useTools) {
        body.tools = tools;
        body.tool_choice = round >= maxRounds ? "none" : "auto";
      }
      const res = await call(body);
      if (!res.ok) {
        if (useTools && round === 0 && looksLikeToolRejection(res.status, res.text)) {
          mode = "context"; // provider rejects tools: fall back to context injection
          round = -1;
          continue;
        }
        return { error: res };
      }
      const msg = firstMessage(res.json);
      if (!msg) return { error: { ok: false, status: 502, text: "empty completion" } };
      const calls = (msg.tool_calls as { id: string; function: { name: string; arguments: string } }[] | undefined) ?? [];
      if (!useTools || calls.length === 0 || round >= maxRounds) {
        return { text: stripThink(String(msg.content ?? "")) };
      }
      convo.push(msg); // keep provider fields (e.g. Gemini thought signatures) intact
      for (const c of calls.slice(0, 8)) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(c.function?.arguments || "{}");
        } catch { /* keep {} */ }
        const name = c.function?.name ?? "";
        let result: unknown;
        try {
          result = await runTool(name, args, ctx);
        } catch (e) {
          result = { error: e instanceof Error ? e.message.slice(0, 120) : "tool failed" };
        }
        if (!toolsUsed.includes(name)) toolsUsed.push(name);
        const content = JSON.stringify(result);
        evidence.push(content);
        convo.push({ role: "tool", tool_call_id: c.id, name, content });
      }
    }
  };

  const first = await complete(MAX_TOOL_ROUNDS);
  if ("error" in first) return { kind: "http_error", status: first.error.status, reason: first.error.text ?? "" };
  let answer = first.text;
  let bad = unsupportedFigures(answer, evidence);
  if (bad.length === 0 && answer) return { kind: "answer", text: answer, toolsUsed, mode, factcheck: "pass" };

  // One repair pass.
  convo.push({ role: "assistant", content: answer });
  convo.push({
    role: "user",
    content:
      `[Exo fact-check] These figures in your last answer are not supported by the account data or tool results: ${
        bad.map((b) => b.raw).join(", ")
      }. Rewrite the full answer for the user. Only use figures returned by tools or present in the account summary; use the calculate tool for any maths, or leave the figure out. Do not mention this check.`,
  });
  const repaired = await complete(2);
  if ("error" in repaired) return { kind: "factcheck_failed", toolsUsed, mode, unsupported: bad.map((b) => b.raw) };
  answer = repaired.text;
  bad = unsupportedFigures(answer, evidence);
  if (bad.length === 0 && answer) return { kind: "answer", text: answer, toolsUsed, mode, factcheck: "repaired" };
  return { kind: "factcheck_failed", toolsUsed, mode, unsupported: bad.map((b) => b.raw) };
}
