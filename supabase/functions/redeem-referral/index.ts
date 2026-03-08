import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Not authenticated");
    const userId = userData.user.id;

    const { referral_code } = await req.json();
    if (!referral_code) throw new Error("Referral code is required");

    const code = referral_code.toUpperCase().trim();

    // Check if user's own code
    const { data: ownProfile } = await supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", userId)
      .single();

    if (ownProfile?.referral_code === code) {
      throw new Error("You cannot use your own referral code");
    }

    // Check if user already redeemed a referral
    const { data: existingRedemption } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_id", userId)
      .limit(1);

    if (existingRedemption && existingRedemption.length > 0) {
      throw new Error("You have already used a referral code");
    }

    // Find the referrer by code
    const { data: referrerProfile } = await supabase
      .from("profiles")
      .select("id, referral_code")
      .eq("referral_code", code)
      .single();

    if (!referrerProfile) {
      throw new Error("Invalid referral code");
    }

    const referrerId = referrerProfile.id;
    const rewardAmount = 10;

    // Create completed referral record
    await supabase.from("referrals").insert({
      referrer_id: referrerId,
      referred_id: userId,
      referral_code: code,
      status: "completed",
      reward_amount: rewardAmount,
      completed_at: new Date().toISOString(),
    });

    // Credit referrer wallet
    const { data: referrerWallet } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", referrerId)
      .eq("currency", "USD")
      .single();

    if (referrerWallet) {
      await supabase
        .from("wallets")
        .update({ balance: referrerWallet.balance + rewardAmount })
        .eq("id", referrerWallet.id);

      await supabase.from("transactions").insert({
        user_id: referrerId,
        type: "cashback",
        amount: rewardAmount,
        description: "Referral bonus — friend joined ExoSky",
        status: "completed",
        metadata: { referral: true, referred_user: userId },
      });
    }

    // Credit referred user wallet
    const { data: referredWallet } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", userId)
      .eq("currency", "USD")
      .single();

    if (referredWallet) {
      await supabase
        .from("wallets")
        .update({ balance: referredWallet.balance + rewardAmount })
        .eq("id", referredWallet.id);

      await supabase.from("transactions").insert({
        user_id: userId,
        type: "cashback",
        amount: rewardAmount,
        description: "Referral welcome bonus — $10 credited",
        status: "completed",
        metadata: { referral: true, referrer_user: referrerId },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Referral redeemed! $10 bonus credited." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
