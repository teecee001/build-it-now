import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Country {
  code: string;
  name: string;
  phone_code: string;
  region: string;
  currency_code: string;
  is_sanctioned: boolean;
  is_supported: boolean;
  features_crypto: boolean;
  features_stocks: boolean;
  features_forex: boolean;
  features_send_money: boolean;
  features_bill_pay: boolean;
  features_cards: boolean;
  features_savings: boolean;
  features_premium: boolean;
  max_single_transaction: number;
  max_daily_transaction: number;
  requires_enhanced_kyc: boolean;
}

export interface GeoVerification {
  country_code: string;
  is_blocked: boolean;
  vpn_detected: boolean;
  location_mismatch: boolean;
  country: Country | null;
}

export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .eq("is_supported", true)
        .eq("is_sanctioned", false)
        .order("name");
      if (error) throw error;
      return data as Country[];
    },
    staleTime: 1000 * 60 * 60,
  });
}

export function useGeoVerification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: geoStatus, isLoading: isCheckingGeo } = useQuery({
    queryKey: ["geo-verification", user?.id],
    queryFn: async (): Promise<GeoVerification | null> => {
      if (!user) return null;
      try {
        const { data, error } = await supabase.functions.invoke("geo-verify", {
          body: { action: "session_check", user_id: user.id },
        });
        if (error) return null;
        if (!data?.success) return null;
        return data.geo as GeoVerification;
      } catch {
        return null;
      }
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  });

  const { data: userGeoRecord } = useQuery({
    queryKey: ["user-geo-record", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_geo_verification")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const hasCompletedGeoSetup = !!userGeoRecord && !!userGeoRecord.country_code;

  const checkCountry = useMutation({
    mutationFn: async (countryCode: string) => {
      const { data, error } = await supabase.functions.invoke("geo-verify", {
        body: { action: "check_country", country_code: countryCode },
      });
      if (error) throw error;
      return data;
    },
  });

  const verifyPhone = useMutation({
    mutationFn: async ({ countryCode, phoneNumber }: { countryCode: string; phoneNumber: string }) => {
      const { data, error } = await supabase.functions.invoke("geo-verify", {
        body: { action: "verify_phone", country_code: countryCode, phone_number: phoneNumber },
      });
      if (error) throw error;
      return data;
    },
  });

  const registerGeo = useMutation({
    mutationFn: async ({ countryCode, phoneNumber }: { countryCode: string; phoneNumber: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("geo-verify", {
        body: { action: "register_geo", user_id: user.id, country_code: countryCode, phone_number: phoneNumber },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Registration failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["geo-verification"] });
      queryClient.invalidateQueries({ queryKey: ["user-geo-record"] });
    },
  });

  const isFeatureAvailable = (feature: keyof Country): boolean => {
    if (!geoStatus?.country) return true;
    const val = geoStatus.country[feature];
    return typeof val === "boolean" ? val : true;
  };

  return {
    geoStatus,
    isCheckingGeo,
    hasCompletedGeoSetup,
    userGeoRecord,
    checkCountry,
    verifyPhone,
    registerGeo,
    isFeatureAvailable,
    isBlocked: geoStatus?.is_blocked ?? false,
    vpnDetected: geoStatus?.vpn_detected ?? false,
  };
}
