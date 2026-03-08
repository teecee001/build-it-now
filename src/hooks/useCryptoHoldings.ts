import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CryptoHolding {
  id: string;
  user_id: string;
  crypto_code: string;
  amount: number;
  avg_buy_price: number;
  created_at: string;
  updated_at: string;
}

export function useCryptoHoldings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ["crypto_holdings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("crypto_holdings" as any)
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []) as unknown as CryptoHolding[];
    },
    enabled: !!user,
  });

  // Realtime sync
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("crypto-holdings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crypto_holdings", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["crypto_holdings"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const holdingsMap: Record<string, number> = {};
  holdings.forEach(h => { holdingsMap[h.crypto_code] = Number(h.amount); });

  const getHolding = (code: string) => holdings.find(h => h.crypto_code === code);

  const upsertHolding = useMutation({
    mutationFn: async ({ code, amountDelta, pricePerUnit }: { code: string; amountDelta: number; pricePerUnit: number }) => {
      if (!user) throw new Error("Not authenticated");
      const existing = getHolding(code);

      if (existing) {
        const newAmount = Number(existing.amount) + amountDelta;
        if (newAmount <= 0.000001) {
          // Remove holding if essentially zero
          await supabase.from("crypto_holdings" as any).delete().eq("id", existing.id);
        } else {
          // Update avg buy price on buys only
          let newAvg = Number(existing.avg_buy_price);
          if (amountDelta > 0) {
            const totalCost = Number(existing.amount) * Number(existing.avg_buy_price) + amountDelta * pricePerUnit;
            newAvg = totalCost / newAmount;
          }
          await supabase
            .from("crypto_holdings" as any)
            .update({ amount: newAmount, avg_buy_price: newAvg } as any)
            .eq("id", existing.id);
        }
      } else if (amountDelta > 0) {
        await supabase.from("crypto_holdings" as any).insert([{
          user_id: user.id,
          crypto_code: code,
          amount: amountDelta,
          avg_buy_price: pricePerUnit,
        }] as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crypto_holdings"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  return { holdings, holdingsMap, isLoading, getHolding, upsertHolding };
}
