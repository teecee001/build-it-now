import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const TIERS = {
  pro: {
    price_id: "price_1T8fhd7TGYrUaVZ5ypAYQgch",
    product_id: "prod_U6tUwJbpoVFlFP",
    name: "ExoSky Pro",
    price: 14.99,
    features: [
      "8% APY on Savings",
      "No transfer fees",
      "Priority support",
      "Higher transaction limits",
      "Metal card upgrade",
      "Early access to features",
    ],
  },
} as const;

export function useSubscription() {
  const { user, session } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      setIsSubscribed(data?.subscribed ?? false);
      setProductId(data?.product_id ?? null);
      setSubscriptionEnd(data?.subscription_end ?? null);
    } catch (err) {
      console.error("Subscription check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const startCheckout = async (tierId: keyof typeof TIERS = "pro") => {
    if (!session?.access_token) return;
    setIsCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: TIERS[tierId].price_id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const openPortal = async () => {
    if (!session?.access_token) return;
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Portal failed:", err);
    }
  };

  const currentTier = productId
    ? Object.entries(TIERS).find(([_, t]) => t.product_id === productId)?.[0] ?? null
    : null;

  return {
    isSubscribed,
    currentTier,
    subscriptionEnd,
    isLoading,
    isCheckoutLoading,
    startCheckout,
    openPortal,
    checkSubscription,
    tiers: TIERS,
  };
}
