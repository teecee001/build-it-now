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

    // Calculate the date 3 days from now (start and end of that day)
    const now = new Date();
    const target = new Date(now);
    target.setDate(target.getDate() + 3);
    const targetDateStr = target.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`Checking for unpaid bills due on ${targetDateStr}`);

    // Find unpaid bills due in exactly 3 days
    const { data: bills, error: billsError } = await supabase
      .from("bills")
      .select("*")
      .eq("is_paid", false)
      .eq("due_date", targetDateStr);

    if (billsError) {
      console.error("Error fetching bills:", billsError);
      throw billsError;
    }

    if (!bills || bills.length === 0) {
      console.log("No bills due in 3 days");
      return new Response(
        JSON.stringify({ success: true, reminders_sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${bills.length} bills due in 3 days`);

    // Check for existing reminders to avoid duplicates (same bill, same day)
    const todayStr = now.toISOString().split("T")[0];

    let remindersSent = 0;

    for (const bill of bills) {
      // Check if we already sent a reminder for this bill today
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", bill.user_id)
        .eq("type", "bill_reminder")
        .gte("created_at", `${todayStr}T00:00:00Z`)
        .like("message", `%${bill.biller_name}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`Already reminded for ${bill.biller_name}, skipping`);
        continue;
      }

      const acctSuffix = bill.account_number
        ? ` (Acct: •••${bill.account_number.slice(-4)})`
        : "";

      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: bill.user_id,
          type: "bill_reminder",
          title: "Bill Due Soon",
          message: `Your ${bill.biller_name}${acctSuffix} bill of $${Number(bill.amount).toFixed(2)} is due on ${targetDateStr}. Pay now to avoid late fees.`,
          metadata: { bill_id: bill.id, due_date: targetDateStr },
        });

      if (notifError) {
        console.error(`Failed to notify for bill ${bill.id}:`, notifError);
      } else {
        remindersSent++;
        console.log(`Reminder sent for ${bill.biller_name} to user ${bill.user_id}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: remindersSent, bills_found: bills.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in check-bill-reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
