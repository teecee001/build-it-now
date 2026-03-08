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

    const { action, user_id, country_code, phone_number } = await req.json();

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

      if (!phone_number?.startsWith(countryData.phone_code)) {
        return jsonResponse({
          success: false,
          error: `Phone number must start with ${countryData.phone_code} for ${country_code}`,
          code: "PHONE_MISMATCH",
        }, 400);
      }

      return jsonResponse({ success: true, phone_verified: true });
    }

    // ─── REGISTER ───
    if (action === "register_geo") {
      if (!user_id) {
        return jsonResponse({ success: false, error: "User ID required" }, 400);
      }

      // Upsert geo record
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

      return jsonResponse({
        success: true,
        geo: {
          country_code: geo.country_code,
          is_blocked: false,
          vpn_detected: false,
          location_mismatch: false,
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
