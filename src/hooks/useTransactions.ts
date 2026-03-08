import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

export function useTransactions(limit?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
    enabled: !!user,
  });

  const addTransaction = useMutation({
    mutationFn: async (tx: {
      type: string;
      amount: number;
      description?: string;
      recipient?: string;
      status?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("transactions").insert([{
        user_id: user.id,
        type: tx.type as any,
        amount: tx.amount,
        description: tx.description || null,
        recipient: tx.recipient || null,
        status: (tx.status || "completed") as any,
        metadata: (tx.metadata || {}) as any,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  const totalIn = transactions.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  return { transactions, isLoading, addTransaction, totalIn, totalOut };
}
