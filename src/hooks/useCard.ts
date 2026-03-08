import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CardData {
  id: string;
  user_id: string;
  card_number_last4: string;
  expiry_month: number;
  expiry_year: number;
  is_frozen: boolean;
  is_active: boolean;
  card_type: string;
  card_format: string;
  card_name: string;
  shipping_status: string | null;
  created_at: string;
}

export function useCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["cards", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CardData[];
    },
    enabled: !!user,
  });

  // Keep backward compat — primary card is the first one
  const card = cards[0] ?? null;

  const toggleFreeze = useMutation({
    mutationFn: async (cardId?: string) => {
      const target = cardId ? cards.find((c) => c.id === cardId) : card;
      if (!target) throw new Error("No card");
      const { error } = await supabase
        .from("cards")
        .update({ is_frozen: !target.is_frozen })
        .eq("id", target.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cards"] }),
  });

  const addCard = useMutation({
    mutationFn: async ({ format, name }: { format: "virtual" | "physical"; name?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const last4 = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      const { error } = await supabase.from("cards").insert({
        user_id: user.id,
        card_number_last4: last4,
        card_format: format,
        card_name: name || (format === "virtual" ? "Virtual Card" : "Physical Card"),
        shipping_status: format === "physical" ? "processing" : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards"] });
      toast.success("Card added successfully");
    },
    onError: (error: any) => {
      console.error("Card creation error:", error);
      toast.error(error?.message || "Failed to create card");
    },
  });

  const updateCardName = useMutation({
    mutationFn: async ({ cardId, name }: { cardId: string; name: string }) => {
      const { error } = await supabase
        .from("cards")
        .update({ card_name: name })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cards"] }),
  });

  return { card, cards, isLoading, toggleFreeze, addCard, updateCardName };
}
