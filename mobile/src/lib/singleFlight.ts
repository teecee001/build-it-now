import { useCallback, useRef, useState } from 'react';

/**
 * Double-submit protection for money flows. `run` sets a synchronous latch before the
 * first await, so a second tap, a second swipe or a re-render mid-request is ignored
 * until the first call settles. Every attempt also gets one idempotency key, so even a
 * network-level retry is de-duplicated by wallet-operation.
 */
export function useSingleFlight() {
  const latch = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = useCallback(async <T,>(fn: (idempotencyKey: string) => Promise<T>): Promise<T | undefined> => {
    if (latch.current) return undefined;
    latch.current = true;
    setBusy(true);
    try {
      return await fn(newIdempotencyKey());
    } finally {
      latch.current = false;
      setBusy(false);
    }
  }, []);
  return { run, busy };
}

export function newIdempotencyKey() {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const r = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${r()}-${r()}-${r()}`;
}
