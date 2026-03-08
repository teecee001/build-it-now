import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface StockHolding {
  id: string;
  user_id: string;
  ticker: string;
  shares: number;
  avg_buy_price: number;
  created_at: string;
  updated_at: string;
}

export function useStockHoldings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ["stock_holdings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("stock_holdings" as any)
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []) as unknown as StockHolding[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("stock-holdings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stock_holdings", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["stock_holdings"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const holdingsMap: Record<string, { shares: number; avgPrice: number }> = {};
  holdings.forEach(h => {
    holdingsMap[h.ticker] = { shares: Number(h.shares), avgPrice: Number(h.avg_buy_price) };
  });

  const getHolding = (ticker: string) => holdings.find(h => h.ticker === ticker);

  const upsertHolding = useMutation({
    mutationFn: async ({ ticker, sharesDelta, pricePerShare }: { ticker: string; sharesDelta: number; pricePerShare: number }) => {
      if (!user) throw new Error("Not authenticated");
      const existing = getHolding(ticker);

      if (existing) {
        const newShares = Number(existing.shares) + sharesDelta;
        if (newShares <= 0.000001) {
          await supabase.from("stock_holdings" as any).delete().eq("id", existing.id);
        } else {
          let newAvg = Number(existing.avg_buy_price);
          if (sharesDelta > 0) {
            const totalCost = Number(existing.shares) * Number(existing.avg_buy_price) + sharesDelta * pricePerShare;
            newAvg = totalCost / newShares;
          }
          await supabase
            .from("stock_holdings" as any)
            .update({ shares: newShares, avg_buy_price: newAvg } as any)
            .eq("id", existing.id);
        }
      } else if (sharesDelta > 0) {
        await supabase.from("stock_holdings" as any).insert([{
          user_id: user.id,
          ticker,
          shares: sharesDelta,
          avg_buy_price: pricePerShare,
        }] as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_holdings"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  return { holdings, holdingsMap, isLoading, getHolding, upsertHolding };
}
