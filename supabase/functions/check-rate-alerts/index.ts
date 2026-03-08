import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch active, untriggered alerts
    const { data: alerts, error: alertsErr } = await supabase
      .from("rate_alerts")
      .select("*")
      .eq("is_active", true)
      .eq("is_triggered", false);

    if (alertsErr) throw alertsErr;
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ checked: 0, triggered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch live fiat rates
    const fiatRes = await fetch("https://open.er-api.com/v6/latest/USD");
    const fiatData = await fiatRes.json();
    const rates: Record<string, number> = fiatData.rates || {};

    // Fetch crypto rates
    const cryptoRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd"
    );
    const cryptoData = await cryptoRes.json();
    if (cryptoData.bitcoin?.usd) rates["BTC"] = 1 / cryptoData.bitcoin.usd;
    if (cryptoData.ethereum?.usd) rates["ETH"] = 1 / cryptoData.ethereum.usd;
    rates["USD"] = 1;

    let triggered = 0;

    for (const alert of alerts) {
      const fromRate = rates[alert.from_currency];
      const toRate = rates[alert.to_currency];
      if (!fromRate || !toRate) continue;

      const currentRate = toRate / fromRate;
      const isTriggered =
        (alert.direction === "above" && currentRate >= alert.target_rate) ||
        (alert.direction === "below" && currentRate <= alert.target_rate);

      if (isTriggered) {
        // Mark as triggered
        await supabase
          .from("rate_alerts")
          .update({ is_triggered: true, triggered_at: new Date().toISOString() })
          .eq("id", alert.id);

        // Create notification
        const dirLabel = alert.direction === "above" ? "reached" : "dropped to";
        await supabase.from("notifications").insert({
          user_id: alert.user_id,
          type: "rate_alert",
          title: "Rate Alert Triggered",
          message: `${alert.from_currency}/${alert.to_currency} has ${dirLabel} ${alert.target_rate}. Current rate: ${currentRate.toFixed(6)}`,
          metadata: {
            alert_id: alert.id,
            from_currency: alert.from_currency,
            to_currency: alert.to_currency,
            target_rate: alert.target_rate,
            current_rate: currentRate,
          },
        });

        triggered++;
      }
    }

    return new Response(
      JSON.stringify({ checked: alerts.length, triggered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Rate alert check error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
