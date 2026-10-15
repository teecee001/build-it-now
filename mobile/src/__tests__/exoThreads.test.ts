/// <reference types="jest" />
import { extractLinks, followUps, splitReply, stripSources, loadHistory, loadThreads, saveHistory, saveThreads, threadKey, withContext } from '@/lib/exo';
jest.mock('@/lib/supabase', () => ({ supabase: { auth: {} }, SUPABASE_URL: 'https://x', SUPABASE_PUBLISHABLE_KEY: 'k' }));

const store: Record<string, string> = {};
beforeAll(() => {
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

test('main Exo thread keeps the legacy history key', () => {
  expect(threadKey('u1', 'exo')).toBe('u1');
  expect(threadKey('u1', 'c-1')).toBe('u1:c-1');
  saveHistory(threadKey('u1', 'c-1'), [{ id: '1', role: 'user', content: 'hi', createdAt: 1 }]);
  expect(loadHistory('u1:c-1')).toHaveLength(1);
  expect(loadHistory('u1')).toHaveLength(0);
});

test('saved chats persist, goals and main are not stored', () => {
  saveThreads('u1', [
    { id: 'c-1', title: 'Trip', kind: 'chat', updatedAt: 1 },
    { id: 'goal:9', title: 'House', kind: 'goal', updatedAt: 0 },
  ]);
  expect(loadThreads('u1').map((t) => t.id)).toEqual(['c-1']);
});

test('extracts source links for previews (deduped, max 3)', () => {
  const md = 'Sources: [Reuters](https://www.reuters.com/a) [Reuters](https://www.reuters.com/a) [FT](https://ft.com/b) [X](https://x.com/c) [Y](https://y.com/d)';
  const l = extractLinks(md);
  expect(l).toHaveLength(3);
  expect(l[0]).toEqual({ title: 'Reuters', url: 'https://www.reuters.com/a', host: 'reuters.com' });
});

test('thread context rides on the first turn only', () => {
  const m = withContext([{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }], '> My goal: House');
  expect(m[0].content).toBe('> My goal: House\n\na');
  expect(m[1].content).toBe('b');
  expect(withContext([{ role: 'user', content: 'a' }])[0].content).toBe('a');
});

test('Sources section is removed from text (shown as cards instead)', () => {
  const md = 'BTC is flat today.\n\n**Sources**\n- [ETF flows](https://reuters.com/a) — Reuters, Oct 14\n- [Wrap](https://coindesk.com/b) — CoinDesk, Oct 14\n';
  expect(stripSources(md)).toBe('BTC is flat today.');
  expect(stripSources('No sources here.')).toBe('No sources here.');
});

test('replies split into short bubbles, lists stay with their lead-in, max 4', () => {
  const parts = splitReply('First thought here, nice and complete.\n\nSecond point is also a full sentence.\n\nHere are options:\n\n- a\n- b\n\nP4 is another full paragraph of text.\n\nP5 is yet another full paragraph of text.\n\nP6 final paragraph that is long enough.');
  expect(parts.length).toBe(4);
  expect(parts[2]).toContain('Here are options:\n\n- a');
});

test('follow-up chips follow the last reply and mode', () => {
  expect(followUps('Your savings earn 6% APY', 'money')).toContain('Project my savings for 5 years');
  expect(followUps('Day 1 of your Lisbon trip', 'life')).toContain('Can I afford this trip?');
  expect(followUps(undefined, 'life')).toHaveLength(3);
});
