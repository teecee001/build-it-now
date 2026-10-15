// Port of src/lib/exoChat.ts askExo(): same ai-advisor endpoint and body
// ({ messages, timezone }); reads the SSE stream as text (RN fetch has no body reader).
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/lib/supabase';

export type ChatRole = 'user' | 'assistant';
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  replyTo?: { id: string; role: ChatRole; excerpt: string };
  reaction?: string;
  read?: boolean;
  /** Source links shown as cards (Sources section is not shown as text). */
  sources?: LinkPreview[];
};
const STORAGE_PREFIX = 'exo-chat:v1:';
const MAX_STORED = 200;
// Same key and shape as the web (src/lib/exoChat.ts); localStorage is expo-sqlite's on native.
export function loadHistory(userKey: string): ChatMessage[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_PREFIX + userKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((m) => m && typeof m.content === 'string') : [];
  } catch {
    return [];
  }
}
export function saveHistory(userKey: string, messages: ChatMessage[]) {
  try { globalThis.localStorage?.setItem(STORAGE_PREFIX + userKey, JSON.stringify(messages.slice(-MAX_STORED))); } catch { /* ignore */ }
}
export function clearHistory(userKey: string) {
  try { globalThis.localStorage?.removeItem(STORAGE_PREFIX + userKey); } catch { /* ignore */ }
}
export const excerpt = (text: string, n = 90) => {
  const flat = text.replace(/[#*_`>|]/g, '').replace(/\s+/g, ' ').trim();
  return flat.length > n ? flat.slice(0, n - 1) + '…' : flat;
};
export const toApiMessages = (messages: ChatMessage[]) =>
  messages.map((m) => ({ role: m.role, content: m.replyTo ? `> ${m.replyTo.excerpt}\n\n${m.content}` : m.content }));
export const CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-advisor`;
export const now = () => Date.now();
export const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function parseSse(raw: string): string {
  let content = '';
  for (let line of raw.split('\n')) {
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (!line.startsWith('data: ')) continue;
    const json = line.slice(6).trim();
    if (json === '[DONE]') break;
    try {
      const delta = JSON.parse(json).choices?.[0]?.delta?.content as string | undefined;
      if (delta) content += delta;
    } catch {
      /* partial line */
    }
  }
  return content;
}

export async function askExo(history: ChatMessage[], context?: string, opts: { mode?: ExoMode } = {}): Promise<{ ok: boolean; text: string }> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Sign in required');
    let timezone: string | undefined;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      timezone = undefined;
    }
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ messages: withContext(toApiMessages(history.slice(-20)), context), timezone, mode: opts.mode ?? 'money' }),
    });
    if (resp.status === 401) return { ok: false, text: 'Please sign in again, then try the advisor.' };
    if (resp.status === 429) return { ok: false, text: 'Rate limit reached. Please try again in a moment.' };
    if (resp.status === 402) return { ok: false, text: 'AI credits exhausted. Please add credits to continue.' };
    if (!resp.ok) throw new Error('Failed to connect to AI');
    const content = parseSse(await resp.text());
    if (!content) return { ok: false, text: 'No response received. Please try again.' };
    return { ok: true, text: content };
  } catch {
    return { ok: false, text: "Sorry, I couldn't process that request. Please try again." };
  }
}

// ---- Conversations (Telegram-style chat list); same keys/shape as web src/lib/exoChat.ts ----
export type ChatThread = { id: string; title: string; kind: 'exo' | 'goal' | 'chat'; updatedAt: number; context?: string };
const THREADS_PREFIX = 'exo-chats:v1:';
export const MAIN_THREAD: ChatThread = { id: 'exo', title: 'Exo', kind: 'exo', updatedAt: 0 };
export const threadKey = (userKey: string, id: string) => (id === 'exo' ? userKey : `${userKey}:${id}`);
export function loadThreads(userKey: string): ChatThread[] {
  try {
    const raw = globalThis.localStorage?.getItem(THREADS_PREFIX + userKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => t && typeof t.id === 'string' && t.id !== 'exo') : [];
  } catch {
    return [];
  }
}
export function saveThreads(userKey: string, threads: ChatThread[]) {
  try { globalThis.localStorage?.setItem(THREADS_PREFIX + userKey, JSON.stringify(threads.filter((t) => t.id !== 'exo' && t.kind !== 'goal').slice(0, 50))); } catch { /* ignore */ }
}
export type LinkPreview = { title: string; url: string; host: string };
export function extractLinks(md: string, max = 3): LinkPreview[] {
  const out: LinkPreview[] = [];
  const seen = new Set<string>();
  const re = /\[([^\]]{1,140})\]\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) && out.length < max) {
    const url = m[2];
    const host = (url.match(/^https?:\/\/([^/?#]+)/)?.[1] ?? '').replace(/^www\./, '');
    if (!host || seen.has(url)) continue;
    seen.add(url);
    out.push({ title: m[1].replace(/[*_`]/g, '').trim(), url, host });
  }
  return out;
}
export const withContext = (msgs: { role: ChatRole; content: string }[], context?: string) =>
  context && msgs.length ? [{ ...msgs[0], content: `${context}\n\n${msgs[0].content}` }, ...msgs.slice(1)] : msgs;

// ---- Messenger intelligence (shared logic; same as web src/lib/exoChat.ts) ----
export type ExoMode = 'money' | 'life';
const MODE_KEY = 'exo-mode:v1';
export function loadMode(): ExoMode {
  try {
    return globalThis.localStorage?.getItem(MODE_KEY) === 'life' ? 'life' : 'money';
  } catch {
    return 'money';
  }
}
export function saveMode(m: ExoMode) {
  try {
    globalThis.localStorage?.setItem(MODE_KEY, m);
  } catch {
    /* ignore */
  }
}

/** Removes a trailing 'Sources' section (heading + link list); the app shows sources as cards. */
export function stripSources(md: string): string {
  return md.replace(/\n+\s*(?:#{1,6}\s*|\*\*)?Sources:?(?:\*\*)?:?\s*\n(?:\s*(?:[-*]|\d+[.)])\s+.*(?:\n|$))+\s*$/i, '').replace(/\n+Sources:\s*(?:\[[^\]]+\]\([^)]+\)[\s,;]*)+$/i, '').trimEnd();
}

/** Splits a reply into up to `max` chat bubbles at paragraph breaks, keeping lists and tables whole. */
export function splitReply(text: string, max = 4): string[] {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of paras) {
    const prev = out[out.length - 1];
    const structural = /^\s*([-*+]|\d+[.)]|\||#{1,6}\s|>)/.test(p);
    // Keep headings/lists with their lead-in, and very short lines with the next thought.
    if (prev && (structural || /:\s*$/.test(prev) || /^#{1,6}\s/.test(prev) || prev.length < 20)) out[out.length - 1] = `${prev}\n\n${p}`;
    else out.push(p);
  }
  while (out.length > max) {
    const last = out.pop()!;
    out[out.length - 1] += `\n\n${last}`;
  }
  return out.length ? out : [text];
}

/** Context-aware follow-up chips from the last Exo reply. */
export function followUps(last: string | undefined, mode: ExoMode): string[] {
  const t = (last ?? '').toLowerCase();
  const pick: string[] = [];
  const add = (cond: boolean, s: string) => cond && !pick.includes(s) && pick.push(s);
  if (mode === 'life') {
    add(/trip|itinerar|flight|hotel|travel/.test(t), 'Add a day to the plan');
    add(/trip|itinerar|flight|hotel|travel/.test(t), 'Can I afford this trip?');
    add(/\$\d|\bbuy\b|shop|deal|listing|in stock/.test(t), 'Show cheaper options');
    add(/\$\d|\bbuy\b|shop|deal|listing|in stock/.test(t), 'Compare the top 2');
    add(/event|dinner|party|meeting|calendar/.test(t), 'Add it to my calendar');
    add(true, 'Plan a weekend trip');
    add(true, 'Find a gift under $50');
    add(true, 'Plan a dinner on Friday');
  } else {
    add(/bitcoin|crypto|btc|eth/.test(t), 'Bull vs bear case for bitcoin');
    add(/saving|apy|interest/.test(t), 'Project my savings for 5 years');
    add(/spend|budget|expense|subscription/.test(t), 'Audit my last 30 days');
    add(/stock|shares|nvda|aapl|earnings|market/.test(t), 'Run a Monte Carlo on my portfolio');
    add(/rate|fed|inflation|yield/.test(t), 'What does this mean for me?');
    add(/goal/.test(t), 'How much per month to hit my goal?');
    add(true, "What's my net worth?");
    add(true, 'What moved markets today?');
    add(true, 'Audit my last 30 days');
  }
  return pick.slice(0, 3);
}
