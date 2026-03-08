import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, user_id, country_code, phone_number, browser_lat, browser_lon } = await req.json();

    // Get client IP from headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (action === "check_ip") {
      // Use ip-api.com (free, no key needed) to get IP geolocation
      let ipCountry = "unknown";
      let isVpn = false;
      let isp = "";

      try {
        const ipRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,countryCode,proxy,hosting,isp`);
        const ipData = await ipRes.json();
        if (ipData.status === "success") {
          ipCountry = ipData.countryCode || "unknown";
          isVpn = ipData.proxy === true || ipData.hosting === true;
          isp = ipData.isp || "";
        }
      } catch (e) {
        console.error("IP lookup failed:", e);
      }

      // Check if country is sanctioned
      const { data: countryData } = await supabase
        .from("countries")
        .select("*")
        .eq("code", country_code)
        .single();

      if (!countryData) {
        return new Response(
          JSON.stringify({ success: false, error: "Country not found", code: "COUNTRY_NOT_FOUND" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (countryData.is_sanctioned) {
        return new Response(
          JSON.stringify({ success: false, error: "Services are not available in your country due to regulatory restrictions.", code: "SANCTIONED" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!countryData.is_supported) {
        return new Response(
          JSON.stringify({ success: false, error: "Services are not yet available in your country.", code: "UNSUPPORTED" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check IP vs claimed country - NON-BLOCKING for onboarding
      const ipMismatch = ipCountry !== "unknown" && ipCountry !== country_code;

      return new Response(
        JSON.stringify({
          success: true,
          ip_country: ipCountry,
          claimed_country: country_code,
          vpn_detected: isVpn,
          ip_mismatch: ipMismatch,
          isp,
          country: countryData,
          // Warning flags but don't block during initial verification
          warning: isVpn ? "VPN/proxy detected - this may be restricted for certain features" : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify_phone") {
      // Validate phone number country code matches selected country
      const { data: countryData } = await supabase
        .from("countries")
        .select("phone_code")
        .eq("code", country_code)
        .single();

      if (!countryData) {
        return new Response(
          JSON.stringify({ success: false, error: "Country not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const phoneMatches = phone_number?.startsWith(countryData.phone_code);
      if (!phoneMatches) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Phone number must start with ${countryData.phone_code} for ${country_code}`,
            code: "PHONE_MISMATCH",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, phone_verified: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "register_geo") {
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: "User ID required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // IP check
      let ipCountry = "unknown";
      let isVpn = false;
      try {
        const ipRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,countryCode,proxy,hosting`);
        const ipData = await ipRes.json();
        if (ipData.status === "success") {
          ipCountry = ipData.countryCode || "unknown";
          isVpn = ipData.proxy === true || ipData.hosting === true;
        }
      } catch (e) {
        console.error("IP lookup failed:", e);
      }

      const locationMismatch = ipCountry !== "unknown" && ipCountry !== country_code;

      // Block if VPN/proxy detected, but NOT for location mismatch alone
      const isBlocked = isVpn;
      const blockReason = isBlocked
        ? `VPN detected with location mismatch. Your IP appears to be from ${ipCountry} but you selected ${country_code}.`
        : null;

      // Upsert geo verification
      const { error: geoError } = await supabase
        .from("user_geo_verification")
        .upsert({
          user_id,
          country_code,
          phone_number: phone_number || "",
          ip_country: ipCountry,
          browser_country: null,
          last_location_check: new Date().toISOString(),
          location_mismatch: locationMismatch,
          vpn_detected: isVpn,
          is_blocked: isBlocked,
          block_reason: blockReason,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (geoError) {
        console.error("Geo upsert error:", geoError);
        throw geoError;
      }

      // Update profile
      await supabase
        .from("profiles")
        .update({ country_code, phone_number })
        .eq("id", user_id);

      if (isBlocked) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: blockReason, 
            code: "BLOCKED", 
            vpn_detected: isVpn, 
            location_mismatch: locationMismatch 
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          verified: true,
          warning: isVpn ? "VPN detected - some features may be restricted" : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "session_check") {
      // Called on each app load to re-verify location
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: "User ID required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: geo } = await supabase
        .from("user_geo_verification")
        .select("*, countries(*)")
        .eq("user_id", user_id)
        .single();

      if (!geo) {
        return new Response(
          JSON.stringify({ success: false, error: "No geo verification found", code: "NO_GEO" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Re-check IP
      let ipCountry = "unknown";
      let isVpn = false;
      try {
        const ipRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,countryCode,proxy,hosting`);
        const ipData = await ipRes.json();
        if (ipData.status === "success") {
          ipCountry = ipData.countryCode || "unknown";
          isVpn = ipData.proxy === true || ipData.hosting === true;
        }
      } catch (e) {
        console.error("IP lookup failed:", e);
      }

      const locationMismatch = ipCountry !== "unknown" && ipCountry !== geo.country_code;
      const isBlocked = isVpn || locationMismatch;

      // Update check
      await supabase
        .from("user_geo_verification")
        .update({
          ip_country: ipCountry,
          last_location_check: new Date().toISOString(),
          location_mismatch: locationMismatch,
          vpn_detected: isVpn,
          is_blocked: isBlocked,
          block_reason: isBlocked
            ? isVpn
              ? "VPN or proxy detected."
              : `IP location (${ipCountry}) does not match registered country (${geo.country_code}).`
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id);

      return new Response(
        JSON.stringify({
          success: true,
          geo: {
            country_code: geo.country_code,
            is_blocked: isBlocked,
            vpn_detected: isVpn,
            location_mismatch: locationMismatch,
            country: geo.countries,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Geo verify error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
