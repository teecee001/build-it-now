// Read-side ports of the web hooks: useMultiCurrencyWallet (wallets), useTransactions,
// useCryptoHoldings and useMarketData. Same tables, query keys and realtime channels.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export interface CurrencyWallet {
  id: string;
  user_id: string;
  balance: number;
  savings_balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  recipient: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CryptoHolding {
  id: string;
  crypto_code: string;
  amount: number;
  avg_buy_price: number;
}

function useRealtime(table: string, keys: string[][]) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const k = JSON.stringify(keys);
  // Unique per hook instance: supabase-js reuses a channel with the same topic.
  const [id] = useState(() => Math.random().toString(36).slice(2));
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`${table}-native-${user.id}-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${user.id}` }, () =>
        (JSON.parse(k) as string[][]).forEach((queryKey) => qc.invalidateQueries({ queryKey })),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, qc, table, k, id]);
}

export function useWallets() {
  const { user } = useAuth();
  useRealtime('wallets', [['multi-wallets'], ['wallet']]);
  const q = useQuery({
    queryKey: ['multi-wallets', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CurrencyWallet[];
    },
  });
  return { wallets: q.data ?? [], isLoading: q.isLoading, refetch: q.refetch };
}

export function useTransactions(limit?: number) {
  const { user } = useAuth();
  useRealtime('transactions', [['transactions'], ['multi-wallets'], ['wallet']]);
  const q = useQuery({
    queryKey: ['transactions', user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase.from('transactions').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });
  return { transactions: q.data ?? [], isLoading: q.isLoading, refetch: q.refetch };
}

export function useCryptoHoldings() {
  const { user } = useAuth();
  useRealtime('crypto_holdings', [['crypto_holdings']]);
  const q = useQuery({
    queryKey: ['crypto_holdings', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('crypto_holdings').select('*').eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as CryptoHolding[];
    },
  });
  return { holdings: q.data ?? [], isLoading: q.isLoading };
}

export type MarketQuote = { price: number; changePct: number; spark: number[] };
export type MarketDataPayload = {
  at?: string;
  sources?: Record<string, string>;
  crypto?: Record<string, MarketQuote>;
  forex?: Record<string, MarketQuote>;
  error?: string;
};

export function useMarketData(cls: 'all' | 'crypto' | 'forex' = 'crypto') {
  const q = useQuery({
    queryKey: ['market-data', cls],
    staleTime: 45_000,
    refetchInterval: 60_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('market-data', { body: { class: cls } });
      if (error) throw new Error(error.message ?? 'market-data unavailable');
      return data as MarketDataPayload;
    },
  });
  return { data: q.data, isLoading: q.isLoading, crypto: q.data?.crypto ?? {}, refetch: q.refetch };
}

/** Port of useExchangeRates: units per 1 USD. Fiat from open.er-api (as the web does),
 *  crypto as 1 / USD price from the market-data function. */
export function useRates() {
  const fiat = useQuery({
    queryKey: ['fiat-rates'],
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('Failed to fetch fiat rates');
      return (await res.json()).rates as Record<string, number>;
    },
  });
  const { crypto } = useMarketData('crypto');
  const rates: Record<string, number> = { USD: 1, ...(fiat.data ?? {}) };
  for (const [code, q] of Object.entries(crypto)) if (q?.price) rates[code] = 1 / q.price;
  const toUSD = (amount: number, cur: string) => amount / (rates[cur] || 1);
  return { rates, toUSD };
}

/** Read-only port of useProfile (profiles row keyed by auth user id). */
export function useProfile() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data as { full_name?: string | null } | null;
    },
  });
  return { profile: q.data };
}
