import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string | null;
  referral_code: string;
  status: string;
  reward_amount: number;
  created_at: string;
  completed_at: string | null;
}

export function useReferrals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile-referral", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (data && !data.referral_code) {
        const code = "EXO" + Math.random().toString(36).substring(2, 8).toUpperCase();
        await supabase.from("profiles").update({ referral_code: code }).eq("id", user.id);
        return { referral_code: code };
      }
      return data;
    },
    enabled: !!user,
  });

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Referral[];
    },
    enabled: !!user,
  });

  const redeemCode = useMutation({
    mutationFn: async (code: string) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("redeem-referral", {
        body: { referral_code: code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const completedCount = referrals.filter((r) => r.status === "completed").length;
  const pendingCount = referrals.filter((r) => r.status === "pending").length;
  const totalEarned = referrals
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + Number(r.reward_amount), 0);

  return {
    referralCode: profile?.referral_code ?? "",
    referrals,
    isLoading,
    redeemCode,
    completedCount,
    pendingCount,
    totalEarned,
  };
}
