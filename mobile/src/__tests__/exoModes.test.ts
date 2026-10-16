/// <reference types="jest" />
import { hubTools, loadHistory, loadThreads, modeKey, saveHistory, saveThreads, threadKey, type ChatMessage } from '@/exo/lib';
jest.mock('@/lib/supabase', () => ({ supabase: { auth: {} }, SUPABASE_URL: 'https://x', SUPABASE_PUBLISHABLE_KEY: 'k' }));

const store: Record<string, string> = {};
beforeAll(() => {
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});
const msg = (id: string, content: string): ChatMessage => ({ id, role: 'user', content, createdAt: 1 });

describe('Exo Money and Life are separate conversations', () => {
  it('Money keeps the legacy key, so untagged history migrates to Money', () => {
    expect(modeKey('u1', 'money')).toBe('u1');
    saveHistory('u1', [msg('a', 'old chat')]);
    expect(loadHistory(modeKey('u1', 'money')).map((m) => m.id)).toEqual(['a']);
    expect(loadHistory(modeKey('u1', 'life'))).toEqual([]);
  });
  it('never mixes messages between modes', () => {
    saveHistory(modeKey('u2', 'money'), [msg('m', 'rebalance')]);
    saveHistory(modeKey('u2', 'life'), [msg('l', 'plan a trip')]);
    expect(loadHistory(modeKey('u2', 'money')).map((m) => m.id)).toEqual(['m']);
    expect(loadHistory(modeKey('u2', 'life')).map((m) => m.id)).toEqual(['l']);
  });
  it('keeps chat lists and thread histories per mode', () => {
    saveThreads(modeKey('u3', 'life'), [{ id: 'c-1', title: 'Trip', kind: 'chat', updatedAt: 1 }]);
    expect(loadThreads(modeKey('u3', 'life'))).toHaveLength(1);
    expect(loadThreads(modeKey('u3', 'money'))).toHaveLength(0);
    saveHistory(threadKey(modeKey('u3', 'life'), 'c-1'), [msg('t', 'day 1')]);
    expect(loadHistory(threadKey(modeKey('u3', 'money'), 'c-1'))).toEqual([]);
  });
});

describe('Exo hubs', () => {
  it('Money hub has its six tools and Life hub its four', () => {
    expect(hubTools('money').map((t) => t.label)).toEqual(['Portfolio & Governor', 'Projections', 'Net worth', 'Markets', 'Macro posture', 'Goals']);
    expect(hubTools('life').map((t) => t.label)).toEqual(['Shopping', 'Trips', 'Events & plans', 'Places']);
  });
  it('Money tools ask right away; Life tools pre-fill the composer', () => {
    expect(hubTools('money').every((t) => t.send)).toBe(true);
    expect(hubTools('life').every((t) => !t.send && t.prompt.endsWith(' '))).toBe(true);
  });
});
