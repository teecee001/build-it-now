// Port of the web's src/hooks/useAuth.tsx (same API). Native differences: the session is
// stored by lib/supabase in the Keychain/Keystore, token refresh only runs while the app is
// in the foreground, and email links come back to the app via the exosky:// scheme.
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  /** Alias kept for the earlier native screens. */
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string, emailRedirectTo?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const authRedirect = () => Linking.createURL('/');

/** Reads tokens from an exosky:// return URL (OAuth or email confirmation) into the session. */
export async function completeAuthFromUrl(url: string) {
  const frag = url.includes('#') ? url.split('#')[1] : url.split('?')[1] ?? '';
  const p = new URLSearchParams(frag);
  const access_token = p.get('access_token');
  const refresh_token = p.get('refresh_token');
  if (access_token && refresh_token) await supabase.auth.setSession({ access_token, refresh_token });
  const code = p.get('code');
  if (code) await supabase.auth.exchangeCodeForSession(code);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setIsLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    const link = Linking.addEventListener('url', ({ url }) => {
      completeAuthFromUrl(url).catch(() => undefined);
    });
    return () => {
      sub.subscription.unsubscribe();
      app.remove();
      link.remove();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, emailRedirectTo?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: emailRedirectTo ?? authRedirect(), data: { full_name: fullName } },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } });
      if (res.ok) {
        const settings = (await res.json()) as { external?: Record<string, boolean> };
        if (settings.external && settings.external.google === false) {
          return { error: new Error("Google sign-in isn't available right now. Please use email and password instead.") };
        }
      }
    } catch {
      /* fall through */
    }
    const redirectTo = authRedirect();
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !data?.url) return { error: (error as Error | null) ?? new Error('Google sign-in failed') };
    // Native OAuth: the system auth session (ASWebAuthenticationSession / Custom Tabs) returns to exosky://.
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') await completeAuthFromUrl(result.url);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, isLoading, loading: isLoading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
