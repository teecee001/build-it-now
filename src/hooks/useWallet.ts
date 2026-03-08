import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  savings_balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export function useWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wallet, isLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .eq("currency", "USD")
        .maybeSingle();
      if (error) throw error;
      return data as Wallet | null;
    },
    enabled: !!user,
  });

  // Realtime subscription for cross-tab sync
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('wallet-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["wallet"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const updateBalance = useMutation({
    mutationFn: async ({ balance, savings_balance }: { balance?: number; savings_balance?: number }) => {
      if (!user || !wallet) throw new Error("No wallet");
      const updates: Record<string, number> = {};
      if (balance !== undefined) updates.balance = balance;
      if (savings_balance !== undefined) updates.savings_balance = savings_balance;
      const { error } = await supabase
        .from("wallets")
        .update(updates)
        .eq("id", wallet.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wallet"] }),
  });

  return {
    wallet,
    isLoading,
    balance: wallet?.balance ?? 0,
    savingsBalance: wallet?.savings_balance ?? 0,
    totalBalance: (wallet?.balance ?? 0) + (wallet?.savings_balance ?? 0),
    updateBalance,
  };
}
