// Request-history hygiene for Exo (pure, testable).
export const MAX_TURNS = 20;

/** Last MAX_TURNS user/assistant turns with string content, each capped in length. */
export function sanitizeMessages(raw: unknown[]): { role: "user" | "assistant"; content: string }[] {
  const ok = raw.filter((m): m is { role: "user" | "assistant"; content: string } => {
    const r = m as { role?: unknown; content?: unknown } | null;
    return !!r && (r.role === "user" || r.role === "assistant") && typeof r.content === "string" && r.content.trim() !== "";
  });
  const recent = ok.slice(-MAX_TURNS).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  while (recent.length && recent[0].role !== "user") recent.shift(); // providers want a user turn first
  return recent;
}

