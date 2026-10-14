// Port of src/lib/exoChat.ts askExo(): same ai-advisor endpoint and body
// ({ messages, timezone }); reads the SSE stream as text (RN fetch has no body reader).
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/lib/supabase';

export type ChatRole = 'user' | 'assistant';
export type ChatMessage = { id: string; role: ChatRole; content: string; createdAt: number };
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

export async function askExo(history: ChatMessage[]): Promise<{ ok: boolean; text: string }> {
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
      body: JSON.stringify({ messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content })), timezone }),
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
