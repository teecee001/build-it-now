import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RateAlert {
  id: string;
  user_id: string;
  from_currency: string;
  to_currency: string;
  target_rate: number;
  direction: "above" | "below";
  is_triggered: boolean;
  triggered_at: string | null;
  is_active: boolean;
  created_at: string;
}

export function useRateAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["rate-alerts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("rate_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RateAlert[];
    },
    enabled: !!user,
  });

  const createAlert = useMutation({
    mutationFn: async (alert: {
      from_currency: string;
      to_currency: string;
      target_rate: number;
      direction: "above" | "below";
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("rate_alerts").insert({
        user_id: user.id,
        ...alert,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rate-alerts"] }),
  });

  const deleteAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rate-alerts"] }),
  });

  const activeAlerts = alerts.filter(a => a.is_active && !a.is_triggered);
  const triggeredAlerts = alerts.filter(a => a.is_triggered);

  return { alerts, activeAlerts, triggeredAlerts, isLoading, createAlert, deleteAlert };
}
