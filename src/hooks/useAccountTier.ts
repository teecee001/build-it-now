import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AccountTierType = "personal" | "pro" | "business" | "bank";

export interface AccountTier {
  id: string;
  user_id: string;
  tier: AccountTierType;
  daily_transaction_limit: number;
  monthly_transaction_limit: number;
  single_transaction_limit: number;
  atm_daily_limit: number;
  max_cards: number;
  created_at: string;
  updated_at: string;
}

export const TIER_CONFIG: Record<AccountTierType, {
  label: string;
  color: string;
  bgColor: string;
  daily: number;
  monthly: number;
  single: number;
  atm: number;
  maxCards: number;
  apyBoost: number;
  features: string[];
}> = {
  personal: {
    label: "Personal",
    color: "text-muted-foreground",
    bgColor: "bg-secondary",
    daily: 2500,
    monthly: 25000,
    single: 1000,
    atm: 500,
    maxCards: 2,
    apyBoost: 0,
    features: ["2 cards (virtual + physical)", "$1,000 per transaction", "$2,500 daily limit", "6% APY"],
  },
  pro: {
    label: "Pro",
    color: "text-warning",
    bgColor: "bg-warning/10",
    daily: 10000,
    monthly: 100000,
    single: 5000,
    atm: 1500,
    maxCards: 5,
    apyBoost: 2,
    features: ["5 cards (virtual + physical)", "$5,000 per transaction", "$10,000 daily limit", "8% APY"],
  },
  business: {
    label: "Business",
    color: "text-accent",
    bgColor: "bg-accent/10",
    daily: 50000,
    monthly: 500000,
    single: 25000,
    atm: 5000,
    maxCards: 15,
    apyBoost: 3,
    features: ["15 cards (virtual + physical)", "$25,000 per transaction", "$50,000 daily limit", "9% APY", "Team card management"],
  },
  bank: {
    label: "Bank",
    color: "text-primary",
    bgColor: "bg-primary/10",
    daily: 250000,
    monthly: 2500000,
    single: 100000,
    atm: 25000,
    maxCards: 50,
    apyBoost: 4,
    features: ["50 cards (virtual + physical)", "$100,000 per transaction", "$250,000 daily limit", "10% APY", "Dedicated account manager", "Custom integrations"],
  },
};

export function useAccountTier() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: accountTier, isLoading } = useQuery({
    queryKey: ["account-tier", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("account_tiers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        // Auto-create if missing (existing user)
        if (error.code === "PGRST116") {
          const { data: newTier, error: insertError } = await supabase
            .from("account_tiers")
            .insert({ user_id: user.id })
            .select()
            .single();
          if (insertError) throw insertError;
          return newTier as AccountTier;
        }
        throw error;
      }
      return data as AccountTier;
    },
    enabled: !!user,
  });

  const tier = (accountTier?.tier ?? "personal") as AccountTierType;
  const config = TIER_CONFIG[tier];

  return {
    accountTier,
    tier,
    config,
    isLoading,
    limits: {
      daily: accountTier?.daily_transaction_limit ?? config.daily,
      monthly: accountTier?.monthly_transaction_limit ?? config.monthly,
      single: accountTier?.single_transaction_limit ?? config.single,
      atm: accountTier?.atm_daily_limit ?? config.atm,
      maxCards: accountTier?.max_cards ?? config.maxCards,
    },
  };
}
