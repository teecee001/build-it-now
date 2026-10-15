/// <reference types="jest" />
jest.mock('@/lib/supabase', () => ({ supabase: { auth: {} }, SUPABASE_URL: 'https://x', SUPABASE_PUBLISHABLE_KEY: 'k' }));
import { extractLinks, loadHistory, loadThreads, saveHistory, saveThreads, threadKey, withContext } from '@/lib/exo';

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
