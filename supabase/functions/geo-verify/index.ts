import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { action, country_code, phone_number } = await req.json();

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData } = token
      ? await supabase.auth.getUser(token)
      : { data: { user: null } };
    const authedUser = userData?.user ?? null;

    // ─── CHECK COUNTRY ───
    if (action === "check_country") {
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

      return jsonResponse({ success: true, country: countryData });
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

      const cleanPhone = phone_number?.replace(/[\s()-]/g, "") || "";
      if (!cleanPhone.startsWith(countryData.phone_code)) {
        return jsonResponse({
          success: false,
          error: `Phone number must start with ${countryData.phone_code} for ${country_code}`,
          code: "PHONE_MISMATCH",
        }, 400);
      }

      // Format only. There is no SMS provider, so this is not a verification.
      return jsonResponse({
        success: true,
        format_ok: true,
        phone_verified: false,
        error: "SMS verification is not available yet.",
      });
    }

    // ─── REGISTER ───
    if (action === "register_geo") {
      if (!authedUser) {
        return jsonResponse({ success: false, error: "Not authenticated" }, 401);
      }
      const user_id = authedUser.id;

      const { data: countryData } = await supabase
        .from("countries")
        .select("code, is_sanctioned, is_supported")
        .eq("code", country_code)
        .maybeSingle();

      if (!countryData) {
        return jsonResponse({ success: false, error: "Country not found", code: "COUNTRY_NOT_FOUND" }, 400);
      }
      if (countryData.is_sanctioned) {
        return jsonResponse({ success: false, error: "Services are not available in your country due to regulatory restrictions.", code: "SANCTIONED" }, 403);
      }
      if (!countryData.is_supported) {
        return jsonResponse({ success: false, error: "Services are not yet available in your country.", code: "UNSUPPORTED" }, 403);
      }

      const ipCountry = (req.headers.get("cf-ipcountry") || req.headers.get("x-vercel-ip-country") || "").toUpperCase();
      const ipKnown = /^[A-Z]{2}$/.test(ipCountry) && ipCountry !== "XX" && ipCountry !== "T1";
      if (ipKnown && ipCountry !== String(country_code || "").toUpperCase()) {
        return jsonResponse({
          success: false,
          error: "That country does not match your network location.",
          code: "LOCATION_MISMATCH",
        }, 403);
      }
      if (ipKnown) {
        const { data: ipRow } = await supabase
          .from("countries")
          .select("is_sanctioned, is_supported")
          .eq("code", ipCountry)
          .maybeSingle();
        if (ipRow?.is_sanctioned || ipRow?.is_supported === false) {
          return jsonResponse({ success: false, error: "Services are not available in your country due to regulatory restrictions.", code: "SANCTIONED" }, 403);
        }
      }

      const { error: geoError } = await supabase
        .from("user_geo_verification")
        .upsert({
          user_id,
          country_code,
          phone_number: phone_number || "",
          is_blocked: false,
          block_reason: null,
          vpn_detected: false,
          location_mismatch: false,
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

      return jsonResponse({ success: true, verified: true });
    }

    // ─── SESSION CHECK ───
    if (action === "session_check") {
      if (!authedUser) {
        return jsonResponse({ success: false, error: "Not authenticated" }, 401);
      }
      const user_id = authedUser.id;

      const { data: geo } = await supabase
        .from("user_geo_verification")
        .select("*, countries(*)")
        .eq("user_id", user_id)
        .single();

      if (!geo) {
        return jsonResponse({ success: false, error: "No geo verification found", code: "NO_GEO" });
      }

      return jsonResponse({
        success: true,
        geo: {
          country_code: geo.country_code,
          is_blocked: !!geo.is_blocked,
          vpn_detected: !!geo.vpn_detected,
          location_mismatch: !!geo.location_mismatch,
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
