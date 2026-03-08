import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Bill {
  id: string;
  user_id: string;
  biller_name: string;
  category: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}

export function useBills() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["bills", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Bill[];
    },
    enabled: !!user,
  });

  const addBill = useMutation({
    mutationFn: async (bill: { biller_name: string; category: string; amount: number; due_date: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("bills").insert({ ...bill, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bills"] }),
  });

  const payBill = useMutation({
    mutationFn: async (billId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("bills")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", billId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });

  return { bills, isLoading, addBill, payBill };
}
