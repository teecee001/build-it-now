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

async function invokeWalletOp(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("wallet-operation", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(error.message || "Wallet operation failed");
  if (data?.error) throw new Error(data.error);
  return data;
}

export { invokeWalletOp };

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
      // Determine direction from balance changes
      if (savings_balance !== undefined && balance !== undefined) {
        const diff = wallet.savings_balance - (savings_balance ?? wallet.savings_balance);
        if (diff < 0) {
          // Transfer to savings
          await invokeWalletOp({ operation: "savings_transfer", direction: "to_savings", amount: Math.abs(diff) });
        } else if (diff > 0) {
          // Transfer to wallet
          await invokeWalletOp({ operation: "savings_transfer", direction: "to_wallet", amount: diff });
        }
      }
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
