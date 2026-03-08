import { useState, useEffect } from "react";
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

// Get browser GPS coordinates (returns null if unavailable/denied)
export function getBrowserLocation(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
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
        // Collect GPS for session checks too
        const gps = await getBrowserLocation();
        const { data, error } = await supabase.functions.invoke("geo-verify", {
          body: {
            action: "session_check",
            user_id: user.id,
            ...(gps ? { browser_lat: gps.lat, browser_lon: gps.lon } : {}),
          },
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

  const checkIp = useMutation({
    mutationFn: async ({ countryCode, browserLat, browserLon }: { countryCode: string; browserLat?: number; browserLon?: number }) => {
      const { data, error } = await supabase.functions.invoke("geo-verify", {
        body: {
          action: "check_ip",
          country_code: countryCode,
          ...(browserLat != null && browserLon != null ? { browser_lat: browserLat, browser_lon: browserLon } : {}),
        },
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
    mutationFn: async ({ countryCode, phoneNumber, browserLat, browserLon }: { countryCode: string; phoneNumber: string; browserLat?: number; browserLon?: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("geo-verify", {
        body: {
          action: "register_geo",
          user_id: user.id,
          country_code: countryCode,
          phone_number: phoneNumber,
          ...(browserLat != null && browserLon != null ? { browser_lat: browserLat, browser_lon: browserLon } : {}),
        },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Verification failed");
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
    checkIp,
    verifyPhone,
    registerGeo,
    isFeatureAvailable,
    isBlocked: geoStatus?.is_blocked ?? false,
    vpnDetected: geoStatus?.vpn_detected ?? false,
  };
}
