import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Reverse-geocode lat/lon to a country code using OpenStreetMap Nominatim
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=3`,
      { headers: { "User-Agent": "ExoSky-GeoVerify/1.0" } }
    );
    const data = await res.json();
    return data?.address?.country_code?.toUpperCase() || null;
  } catch (e) {
    console.error("Reverse geocode failed:", e);
    return null;
  }
}

// Get IP info: country, VPN/proxy flag, ISP
async function getIpInfo(ip: string): Promise<{ country: string; isVpn: boolean; isp: string }> {
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode,proxy,hosting,isp`);
    const data = await res.json();
    if (data.status === "success") {
      return {
        country: data.countryCode || "unknown",
        isVpn: data.proxy === true || data.hosting === true,
        isp: data.isp || "",
      };
    }
  } catch (e) {
    console.error("IP lookup failed:", e);
  }
  return { country: "unknown", isVpn: false, isp: "" };
}

// Determine blocking status from multiple signals
function determineBlock(
  ipCountry: string,
  gpsCountry: string | null,
  claimedCountry: string,
  isVpn: boolean,
  hasGps: boolean
): { isBlocked: boolean; reason: string | null; locationMismatch: boolean } {
  const ipMismatch = ipCountry !== "unknown" && ipCountry !== claimedCountry;
  const gpsMismatch = gpsCountry !== null && gpsCountry !== claimedCountry;
  const gpsMatchesClaimed = gpsCountry !== null && gpsCountry === claimedCountry;

  // VPN always blocks
  if (isVpn) {
    return {
      isBlocked: true,
      reason: "VPN or proxy detected. Please disable it to continue.",
      locationMismatch: ipMismatch,
    };
  }

  // If IP mismatches claimed country:
  if (ipMismatch) {
    // GPS confirms user is in claimed country → allow (traveling, different IP)
    if (gpsMatchesClaimed) {
      return { isBlocked: false, reason: null, locationMismatch: true };
    }
    // GPS also mismatches → spoofing, block
    if (gpsMismatch) {
      return {
        isBlocked: true,
        reason: `Location spoofing detected. Your IP (${ipCountry}) and GPS (${gpsCountry}) don't match your registered country (${claimedCountry}).`,
        locationMismatch: true,
      };
    }
    // No GPS available → can't confirm, allow with warning
    if (!hasGps) {
      return { isBlocked: false, reason: null, locationMismatch: true };
    }
  }

  return { isBlocked: false, reason: null, locationMismatch: false };
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, user_id, country_code, phone_number, browser_lat, browser_lon } = await req.json();

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const hasGps = typeof browser_lat === "number" && typeof browser_lon === "number";

    // ─── CHECK IP ───
    if (action === "check_ip") {
      const [ipInfo, gpsCountry] = await Promise.all([
        getIpInfo(clientIp),
        hasGps ? reverseGeocode(browser_lat, browser_lon) : Promise.resolve(null),
      ]);

      const { data: countryData } = await supabase
        .from("countries")
        .select("*")
        .eq("code", country_code)
        .single();

      if (!countryData) {
        return jsonResponse({ success: false, error: "Country not found", code: "COUNTRY_NOT_FOUND" }, 400);
      }
      if (countryData.is_sanctioned) {
        return jsonResponse({ success: false, error: "Services are not available in your country due to regulatory restrictions.", code: "SANCTIONED" }, 403);
      }
      if (!countryData.is_supported) {
        return jsonResponse({ success: false, error: "Services are not yet available in your country.", code: "UNSUPPORTED" }, 403);
      }

      const { isBlocked, reason, locationMismatch } = determineBlock(
        ipInfo.country, gpsCountry, country_code, ipInfo.isVpn, hasGps
      );

      return jsonResponse({
        success: true,
        ip_country: ipInfo.country,
        gps_country: gpsCountry,
        claimed_country: country_code,
        vpn_detected: ipInfo.isVpn,
        ip_mismatch: locationMismatch,
        spoofing_detected: isBlocked && !ipInfo.isVpn,
        is_blocked: isBlocked,
        block_reason: reason,
        isp: ipInfo.isp,
        country: countryData,
      });
    }

    // ─── VERIFY PHONE ───
    if (action === "verify_phone") {
      const { data: countryData } = await supabase
        .from("countries")
        .select("phone_code")
        .eq("code", country_code)
        .single();

      if (!countryData) {
        return jsonResponse({ success: false, error: "Country not found" }, 400);
      }

      if (!phone_number?.startsWith(countryData.phone_code)) {
        return jsonResponse({
          success: false,
          error: `Phone number must start with ${countryData.phone_code} for ${country_code}`,
          code: "PHONE_MISMATCH",
        }, 400);
      }

      return jsonResponse({ success: true, phone_verified: true });
    }

    // ─── REGISTER GEO ───
    if (action === "register_geo") {
      if (!user_id) {
        return jsonResponse({ success: false, error: "User ID required" }, 400);
      }

      const [ipInfo, gpsCountry] = await Promise.all([
        getIpInfo(clientIp),
        hasGps ? reverseGeocode(browser_lat, browser_lon) : Promise.resolve(null),
      ]);

      const { isBlocked, reason, locationMismatch } = determineBlock(
        ipInfo.country, gpsCountry, country_code, ipInfo.isVpn, hasGps
      );

      const { error: geoError } = await supabase
        .from("user_geo_verification")
        .upsert({
          user_id,
          country_code,
          phone_number: phone_number || "",
          ip_country: ipInfo.country,
          browser_country: gpsCountry,
          last_location_check: new Date().toISOString(),
          location_mismatch: locationMismatch,
          vpn_detected: ipInfo.isVpn,
          is_blocked: isBlocked,
          block_reason: reason,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (geoError) {
        console.error("Geo upsert error:", geoError);
        throw geoError;
      }

      await supabase
        .from("profiles")
        .update({ country_code, phone_number })
        .eq("id", user_id);

      if (isBlocked) {
        return jsonResponse({
          success: false,
          error: reason,
          code: "BLOCKED",
          vpn_detected: ipInfo.isVpn,
          location_mismatch: locationMismatch,
        }, 403);
      }

      return jsonResponse({
        success: true,
        verified: true,
        warning: locationMismatch ? "Your IP location differs from your registered country. If traveling, this is normal." : null,
      });
    }

    // ─── SESSION CHECK ───
    if (action === "session_check") {
      if (!user_id) {
        return jsonResponse({ success: false, error: "User ID required" }, 400);
      }

      const { data: geo } = await supabase
        .from("user_geo_verification")
        .select("*, countries(*)")
        .eq("user_id", user_id)
        .single();

      if (!geo) {
        return jsonResponse({ success: false, error: "No geo verification found", code: "NO_GEO" });
      }

      const [ipInfo, gpsCountry] = await Promise.all([
        getIpInfo(clientIp),
        hasGps ? reverseGeocode(browser_lat, browser_lon) : Promise.resolve(null),
      ]);

      const { isBlocked, reason, locationMismatch } = determineBlock(
        ipInfo.country, gpsCountry, geo.country_code, ipInfo.isVpn, hasGps
      );

      await supabase
        .from("user_geo_verification")
        .update({
          ip_country: ipInfo.country,
          browser_country: gpsCountry,
          last_location_check: new Date().toISOString(),
          location_mismatch: locationMismatch,
          vpn_detected: ipInfo.isVpn,
          is_blocked: isBlocked,
          block_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id);

      return jsonResponse({
        success: true,
        geo: {
          country_code: geo.country_code,
          is_blocked: isBlocked,
          vpn_detected: ipInfo.isVpn,
          location_mismatch: locationMismatch,
          country: geo.countries,
        },
      });
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (error) {
    console.error("Geo verify error:", error);
    return jsonResponse({ success: false, error: error.message }, 500);
  }
});
