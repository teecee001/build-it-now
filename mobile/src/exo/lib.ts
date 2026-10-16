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

// ---- Rich cards parsed from Exo replies (pure; same in web and mobile) ----
export type AllocationRow = { symbol: string; pct: number; note?: string };
/** '- **BTC**: 20% (crypto cap)' style rows from a Governor / allocation reply. */
export function parseAllocation(md: string): AllocationRow[] {
  if (!/governor|allocat|rebalanc|weights?|portfolio/i.test(md)) return [];
  const rows: AllocationRow[] = [];
  const re = /^\s*(?:[-*]|\d+[.)])\s+\**([A-Za-z][A-Za-z0-9.]{0,9})\**\s*[:–—-]\s*\**(\d{1,3}(?:\.\d+)?)\s?%\**\s*(?:\(([^)]{1,40})\))?/;
  for (const line of md.split('\n')) {
    const m = line.match(re);
    if (m) rows.push({ symbol: m[1].toUpperCase(), pct: Number(m[2]), note: m[3]?.trim() });
  }
  const sum = rows.reduce((s, r) => s + r.pct, 0);
  return rows.length >= 2 && sum <= 100.5 ? rows : [];
}

export type ItineraryRow = { label: string; text: string };
/** '**Sat, Nov 8** · Morning: …' or 'Day 1: …' lines from a Life plan. */
export function parseItinerary(md: string): ItineraryRow[] {
  const rows: ItineraryRow[] = [];
  const re = /^\s*(?:[-*]\s+)?\**((?:Day\s+\d+)|(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+[A-Z][a-z]{2,8}\.?\s+\d{1,2}))\**\s*[·:—–-]\s*(.+)$/;
  for (const line of md.split('\n')) {
    const m = line.match(re);
    if (m) rows.push({ label: m[1].replace(/\s+/g, ' '), text: m[2].replace(/\*\*/g, '').trim() });
  }
  return rows.length >= 2 ? rows : [];
}

const CRYPTO = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK'];
const STOCKS = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'SPY', 'QQQ', 'AMD', 'NFLX'];
const NAMES: Record<string, string> = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', nvidia: 'NVDA', tesla: 'TSLA', apple: 'AAPL' };
/** Up to 3 tickers mentioned in a reply, with their asset class (prices come from live market data, never the text). */
export function mentionedTickers(md: string, max = 3): { symbol: string; cls: 'crypto' | 'stocks' }[] {
  const out: { symbol: string; cls: 'crypto' | 'stocks' }[] = [];
  const add = (s: string) => {
    if (out.length >= max || out.some((o) => o.symbol === s)) return;
    out.push({ symbol: s, cls: CRYPTO.includes(s) ? 'crypto' : 'stocks' });
  };
  const text = md.replace(/\]\([^)]*\)/g, ']');
  for (const m of text.matchAll(/\b([A-Z]{2,5})\b/g)) if (CRYPTO.includes(m[1]) || STOCKS.includes(m[1])) add(m[1]);
  for (const [name, sym] of Object.entries(NAMES)) if (new RegExp(`\\b${name}\\b`, 'i').test(text)) add(sym);
  return out;
}

export type ProductCardData = { title: string; url: string; host: string; price: string | null };
/** Product links in a Life reply: '[Name](url) — $89' lines. Price only if written next to the link. */
export function parseProducts(md: string, max = 4): ProductCardData[] {
  const out: ProductCardData[] = [];
  for (const line of md.split('\n')) {
    const m = /\[([^\]]{2,120})\]\((https?:\/\/[^\s)]+)\)/.exec(line);
    if (!m || /reuters|bloomberg|coindesk|cnbc|wsj|ft\.com|news/i.test(m[2])) continue;
    const price = /(?:US)?\$\s?\d[\d,]*(?:\.\d{2})?/.exec(line.replace(m[0], ''))?.[0] ?? null;
    if (!price && !/shop|buy|store|amazon|ebay|walmart|target|bestbuy/i.test(line + m[2])) continue;
    const host = (m[2].match(/^https?:\/\/([^/?#]+)/)?.[1] ?? '').replace(/^www\./, '');
    out.push({ title: m[1].replace(/[*_`]/g, ''), url: m[2], host, price });
    if (out.length >= max) break;
  }
  return out;
}

/** Savings APY by plan: Personal 6%, Pro 8%, Business 9%, Bank 10% (6% base + plan boost). */
export const apyForBoost = (apyBoost: number | undefined) => 6 + (Number.isFinite(apyBoost) ? Number(apyBoost) : 0);
/** Month-by-month savings projection for the money pulse chart. */
export function projectSeries(principal: number, apyPct: number, months = 12): number[] {
  const r = Math.pow(1 + apyPct / 100, 1 / 12) - 1;
  return Array.from({ length: months + 1 }, (_, i) => Math.round(principal * Math.pow(1 + r, i) * 100) / 100);
}

/**
 * Storage key per mode: Money and Life are separate conversations.
 * Money keeps the original key, so existing (untagged) history migrates to Money untouched.
 */
export const modeKey = (userKey: string, mode: ExoMode) => (mode === 'life' ? `${userKey}~life` : userKey);

/**
 * Hub tools per mode. Each one runs through Exo's live server tools:
 * send=true asks right away (it needs only the user's own data); send=false pre-fills the composer for the user to finish.
 */
export type HubTool = { id: string; mode: ExoMode; label: string; prompt: string; send: boolean };
export const HUB_TOOLS: HubTool[] = [
  { id: 'portfolio', mode: 'money', label: 'Portfolio & Governor', prompt: 'Check my portfolio risk and allocation against my Governor limits', send: true },
  { id: 'projection', mode: 'money', label: 'Projections', prompt: 'Run a Monte Carlo simulation of my savings over 5 years', send: true },
  { id: 'networth', mode: 'money', label: 'Net worth', prompt: 'What is my net worth? Run an accounting check on my accounts', send: true },
  { id: 'markets', mode: 'money', label: 'Markets', prompt: 'Give me live quotes for BTC, ETH and SPY', send: true },
  { id: 'macro', mode: 'money', label: 'Macro posture', prompt: 'What is the macro posture right now and what does it mean for my risk?', send: true },
  { id: 'goals', mode: 'money', label: 'Goals', prompt: 'How am I tracking on my goals?', send: true },
  { id: 'shopping', mode: 'life', label: 'Shopping', prompt: 'Find me ', send: false },
  { id: 'trips', mode: 'life', label: 'Trips', prompt: 'Plan a weekend trip to ', send: false },
  { id: 'events', mode: 'life', label: 'Events & plans', prompt: 'Plan an event: ', send: false },
  { id: 'places', mode: 'life', label: 'Places', prompt: 'Find a good place nearby for ', send: false },
];
export const hubTools = (mode: ExoMode) => HUB_TOOLS.filter((t) => t.mode === mode);
