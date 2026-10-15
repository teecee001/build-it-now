// Chat model, persistence and API client for the Exo advisor screen.
// The request/response contract with the ai-advisor edge function is unchanged:
// POST { messages: {role, content}[] } -> text/event-stream of OpenAI-style deltas.
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export type ChatRole = "user" | "assistant";
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  replyTo?: { id: string; role: ChatRole; excerpt: string };
  reaction?: string;
  read?: boolean;
};

export const CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-advisor`;
const STORAGE_PREFIX = "exo-chat:v1:";
const MAX_STORED = 200;

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function loadHistory(userKey: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((m) => m && typeof m.content === "string") : [];
  } catch {
    return [];
  }
}

export function saveHistory(userKey: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + userKey, JSON.stringify(messages.slice(-MAX_STORED)));
  } catch {
    /* storage full or unavailable: history just isn't persisted */
  }
}

export function clearHistory(userKey: string) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + userKey);
  } catch {
    /* ignore */
  }
}

export const excerpt = (text: string, n = 90) => {
  const flat = text.replace(/[#*_`>|]/g, "").replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n - 1) + "…" : flat;
};

/** What the model sees: quoted replies are passed as a markdown quote, same {role, content} shape. */
export const toApiMessages = (messages: ChatMessage[]) =>
  messages.map((m) => ({
    role: m.role,
    content: m.replyTo ? `> ${m.replyTo.excerpt}\n\n${m.content}` : m.content,
  }));

export type AdvisorResult = { ok: true; text: string } | { ok: false; text: string };

export async function askExo(history: ChatMessage[], context?: string): Promise<AdvisorResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Sign in required");

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        // Only recent turns are useful to the model; long histories used to be rejected.
        messages: withContext(toApiMessages(history.slice(-20)), context),
        timezone: (() => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
          } catch {
            return undefined;
          }
        })(),
      }),
    });

    if (resp.status === 401) return { ok: false, text: "Please sign in again, then try the advisor." };
    if (resp.status === 429) return { ok: false, text: "Rate limit reached. Please try again in a moment." };
    if (resp.status === 402) return { ok: false, text: "AI credits exhausted. Please add credits to continue." };
    if (!resp.ok || !resp.body) throw new Error("Failed to connect to AI");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        let line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (json === "[DONE]") {
          done = true;
          break;
        }
        try {
          const delta = JSON.parse(json).choices?.[0]?.delta?.content as string | undefined;
          if (delta) content += delta;
        } catch {
          buffer = line + "\n" + buffer;
          break;
        }
      }
    }
    if (!content) return { ok: false, text: "No response received. Please try again." };
    return { ok: true, text: content };
  } catch (e) {
    console.error("AI error:", e);
    return { ok: false, text: "Sorry, I couldn't process that request. Please try again." };
  }
}

/** Splits markdown into plain blocks and GFM pipe tables (react-markdown has no GFM plugin installed). */
export type Block = { kind: "md"; text: string } | { kind: "table"; header: string[]; rows: string[][] };
const cells = (line: string) =>
  line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
export function splitBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const out: Block[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.join("").trim()) out.push({ kind: "md", text: buf.join("\n") });
    buf = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const isRow = (l?: string) => !!l && /^\s*\|.*\|\s*$/.test(l);
    if (isRow(lines[i]) && lines[i + 1] && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flush();
      const header = cells(lines[i]);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isRow(lines[i])) rows.push(cells(lines[i++]));
      i--;
      out.push({ kind: "table", header, rows });
    } else buf.push(lines[i]);
  }
  flush();
  return out;
}

/** Pulls "Label: $1,234.56" / "Label: 6%" style figures for the numbers card. */
export type Figure = { label: string; value: string };
export function extractFigures(md: string): Figure[] {
  const figs: Figure[] = [];
  const re = /^\s*(?:[-*]\s+)?\**([A-Za-z][A-Za-z0-9 ()/'’-]{1,32}?)\**\s*:\**\s*\**((?:[-+−]?\$|€|£)\s?[\d,]+(?:\.\d+)?|[-+−]?[\d.,]+\s?%(?:\s?APY)?)\**/;
  for (const line of md.split("\n")) {
    const m = line.match(re);
    if (m) figs.push({ label: m[1].trim(), value: m[2].replace(/\s+/g, " ") });
    if (figs.length === 4) break;
  }
  return figs.length >= 2 ? figs : [];
}

// ---- Conversations (Telegram-style chat list) ----
// The main Exo thread keeps the original storage key, so existing history is untouched.
export type ChatThread = { id: string; title: string; kind: "exo" | "goal" | "chat"; updatedAt: number; context?: string };
const THREADS_PREFIX = "exo-chats:v1:";
export const MAIN_THREAD: ChatThread = { id: "exo", title: "Exo", kind: "exo", updatedAt: 0 };
export const threadKey = (userKey: string, id: string) => (id === "exo" ? userKey : `${userKey}:${id}`);

export function loadThreads(userKey: string): ChatThread[] {
  try {
    const raw = localStorage.getItem(THREADS_PREFIX + userKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => t && typeof t.id === "string" && t.id !== "exo") : [];
  } catch {
    return [];
  }
}
export function saveThreads(userKey: string, threads: ChatThread[]) {
  try {
    localStorage.setItem(THREADS_PREFIX + userKey, JSON.stringify(threads.filter((t) => t.id !== "exo" && t.kind !== "goal").slice(0, 50)));
  } catch {
    /* ignore */
  }
}

/** Markdown links in an Exo reply (its Sources), for link-preview cards. */
export type LinkPreview = { title: string; url: string; host: string };
export function extractLinks(md: string, max = 3): LinkPreview[] {
  const out: LinkPreview[] = [];
  const seen = new Set<string>();
  const re = /\[([^\]]{1,140})\]\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) && out.length < max) {
    try {
      const u = new URL(m[2]);
      if (seen.has(u.href)) continue;
      seen.add(u.href);
      out.push({ title: m[1].replace(/[*_`]/g, "").trim(), url: u.href, host: u.hostname.replace(/^www\./, "") });
    } catch {
      /* not a URL */
    }
  }
  return out;
}

/** Thread context (e.g. a goal) is passed as a quoted preamble on the first turn; same {role, content} contract. */
export const withContext = (msgs: { role: ChatRole; content: string }[], context?: string) =>
  context && msgs.length ? [{ ...msgs[0], content: `${context}\n\n${msgs[0].content}` }, ...msgs.slice(1)] : msgs;
