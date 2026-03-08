import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RecurringPayment {
  id: string;
  user_id: string;
  recipient: string;
  amount: number;
  currency: string;
  frequency: string;
  description: string | null;
  next_payment_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useRecurringPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["recurring_payments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("recurring_payments" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("next_payment_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RecurringPayment[];
    },
    enabled: !!user,
  });

  const addPayment = useMutation({
    mutationFn: async (payment: {
      recipient: string;
      amount: number;
      currency?: string;
      frequency: string;
      description?: string;
      next_payment_date: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("recurring_payments" as any).insert([{
        user_id: user.id,
        ...payment,
      }] as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring_payments"] }),
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; is_active?: boolean; next_payment_date?: string }) => {
      const { error } = await supabase
        .from("recurring_payments" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring_payments"] }),
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_payments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurring_payments"] }),
  });

  return { payments, isLoading, addPayment, updatePayment, deletePayment };
}
