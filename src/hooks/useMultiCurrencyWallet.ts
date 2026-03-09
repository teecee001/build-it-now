import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountTier, AccountTierType } from "@/hooks/useAccountTier";

export interface CurrencyWallet {
  id: string;
  user_id: string;
  balance: number;
  savings_balance: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

const CURRENCY_SLOTS: Record<AccountTierType, number> = {
  personal: 3,
  pro: 5,
  business: 8,
  bank: 100, // effectively unlimited
};

export function useMultiCurrencyWallet() {
  const { user } = useAuth();
  const { tier } = useAccountTier();
  const queryClient = useQueryClient();
  const maxCurrencies = CURRENCY_SLOTS[tier];

  const { data: wallets = [], isLoading } = useQuery({
    queryKey: ["multi-wallets", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CurrencyWallet[];
    },
    enabled: !!user,
  });

  // Realtime sync
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("multi-wallets-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["multi-wallets"] });
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const addCurrency = useMutation({
    mutationFn: async (currency: string) => {
      if (!user) throw new Error("Not authenticated");
      // Check if already exists
      const existing = wallets.find(w => w.currency === currency);
      if (existing) throw new Error(`You already have a ${currency} wallet`);
      // Check tier limit
      if (wallets.length >= maxCurrencies) {
        throw new Error(`Your ${tier} account supports up to ${maxCurrencies} currencies. Upgrade to add more.`);
      }
      const { error } = await supabase.from("wallets").insert({
        user_id: user.id,
        balance: 0,
        savings_balance: 0,
        currency,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multi-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  const convertCurrency = useMutation({
    mutationFn: async ({
      fromCurrency,
      toCurrency,
      amount,
      rate,
    }: {
      fromCurrency: string;
      toCurrency: string;
      amount: number;
      rate: number;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const fromWallet = wallets.find(w => w.currency === fromCurrency);
      if (!fromWallet) throw new Error(`No ${fromCurrency} wallet found`);
      if (fromWallet.balance < amount) throw new Error(`Insufficient ${fromCurrency} balance`);

      if (!wallets.find(w => w.currency === toCurrency) && wallets.length >= maxCurrencies) {
        throw new Error(`Your ${tier} account supports up to ${maxCurrencies} currencies. Upgrade to add more.`);
      }

      const { invokeWalletOp } = await import("@/hooks/useWallet");
      const result = await invokeWalletOp({
        operation: "convert",
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount,
        rate,
      });

      return { convertedAmount: result.convertedAmount ?? amount * rate };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["multi-wallets"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const getWallet = (currency: string) => wallets.find(w => w.currency === currency);

  return {
    wallets,
    isLoading,
    addCurrency,
    convertCurrency,
    getWallet,
    maxCurrencies,
    slotsUsed: wallets.length,
    slotsRemaining: maxCurrencies - wallets.length,
    tier,
  };
}
