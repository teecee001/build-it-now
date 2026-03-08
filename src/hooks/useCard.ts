import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Card {
  id: string;
  user_id: string;
  card_number_last4: string;
  expiry_month: number;
  expiry_year: number;
  is_frozen: boolean;
  is_active: boolean;
  card_type: string;
  created_at: string;
}

export function useCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: card, isLoading } = useQuery({
    queryKey: ["card", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data as Card;
    },
    enabled: !!user,
  });

  const toggleFreeze = useMutation({
    mutationFn: async () => {
      if (!card) throw new Error("No card");
      const { error } = await supabase
        .from("cards")
        .update({ is_frozen: !card.is_frozen })
        .eq("id", card.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["card"] }),
  });

  return { card, isLoading, toggleFreeze };
}
