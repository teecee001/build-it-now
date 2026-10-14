// Port of invokeWalletOp from the web app (src/hooks/useWallet.ts): same edge
// function, same body contract, same one-shot refresh-and-retry on auth failure.
import { supabase } from '@/lib/supabase';

const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';
const isAuthFailure = (m: string) => m === 'Not authenticated' || m === 'No authorization header';

async function currentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  if (data?.session?.access_token) return data.session.access_token;
  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed?.session?.access_token ?? null;
}

async function endExpiredSession(): Promise<never> {
  await supabase.auth.signOut().catch(() => undefined);
  throw new Error(SESSION_EXPIRED_MESSAGE);
}

async function callWalletOp(body: Record<string, unknown>, token: string) {
  const { data, error } = await supabase.functions.invoke('wallet-operation', {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const bodyJson = await ctx.json();
        if (bodyJson?.error) throw new Error(String(bodyJson.error));
      } catch (e) {
        if (e instanceof Error && e.message !== error.message) throw e;
      }
    }
    throw new Error(error.message || 'Wallet operation failed');
  }
  return data;
}

export async function invokeWalletOp(body: Record<string, unknown>) {
  const token = await currentAccessToken();
  if (!token) return endExpiredSession();
  try {
    return await callWalletOp(body, token);
  } catch (err) {
    if (!(err instanceof Error) || !isAuthFailure(err.message)) throw err;
    const { data: refreshed } = await supabase.auth.refreshSession();
    const fresh = refreshed?.session?.access_token;
    if (!fresh) return endExpiredSession();
    try {
      return await callWalletOp(body, fresh);
    } catch (retryErr) {
      if (retryErr instanceof Error && isAuthFailure(retryErr.message)) return endExpiredSession();
      throw retryErr;
    }
  }
}
