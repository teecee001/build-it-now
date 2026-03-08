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
      rate: number; // how many units of toCurrency per 1 unit of fromCurrency
    }) => {
      if (!user) throw new Error("Not authenticated");
      const fromWallet = wallets.find(w => w.currency === fromCurrency);
      if (!fromWallet) throw new Error(`No ${fromCurrency} wallet found`);
      if (fromWallet.balance < amount) throw new Error(`Insufficient ${fromCurrency} balance`);

      let toWallet = wallets.find(w => w.currency === toCurrency);

      // Auto-create destination wallet if within tier limit
      if (!toWallet) {
        if (wallets.length >= maxCurrencies) {
          throw new Error(`Your ${tier} account supports up to ${maxCurrencies} currencies. Upgrade to add more.`);
        }
        const { data, error } = await supabase
          .from("wallets")
          .insert({ user_id: user.id, balance: 0, savings_balance: 0, currency: toCurrency })
          .select()
          .single();
        if (error) throw error;
        toWallet = data as CurrencyWallet;
      }

      const convertedAmount = amount * rate;

      // Deduct from source
      const { error: deductErr } = await supabase
        .from("wallets")
        .update({ balance: fromWallet.balance - amount })
        .eq("id", fromWallet.id);
      if (deductErr) throw deductErr;

      // Credit to destination
      const { error: creditErr } = await supabase
        .from("wallets")
        .update({ balance: toWallet.balance + convertedAmount })
        .eq("id", toWallet.id);
      if (creditErr) throw creditErr;

      // Log transaction
      const usdEquivalent = fromCurrency === "USD" ? amount : amount; // simplified
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "conversion" as any,
        amount: -Math.abs(usdEquivalent),
        description: `Converted ${amount.toFixed(2)} ${fromCurrency} → ${convertedAmount.toFixed(4)} ${toCurrency}`,
        status: "completed" as any,
        metadata: { from: fromCurrency, to: toCurrency, from_amount: amount, to_amount: convertedAmount, rate } as any,
      });

      return { convertedAmount };
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
