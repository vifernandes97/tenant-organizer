import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require shared cron secret to prevent unauthenticated invocation
    const CRON_SECRET = Deno.env.get("CRON_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");

    if (!CRON_SECRET || !providedSecret || providedSecret !== CRON_SECRET) {
      console.error("auto-publish: unauthorized invocation attempt");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("auto-publish: missing required configuration");
      return new Response(
        JSON.stringify({ error: "Service unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date().toISOString();

    // Excluir tenants bloqueados (status efetivo = locked)
    const { data: subs } = await supabase
      .from("tenant_subscriptions")
      .select("tenant_id, status, trial_ends_at, current_period_end, plan_override");

    const lockedTenants = (subs || [])
      .filter((s: any) => {
        if (s.plan_override === true) return false;
        if (s.status === "active") return false;
        if (s.status === "trialing" && s.trial_ends_at && new Date(s.trial_ends_at) > new Date()) return false;
        if (s.status === "past_due" && s.current_period_end && new Date(s.current_period_end).getTime() + 7 * 86400000 > Date.now()) return false;
        return true;
      })
      .map((s: any) => s.tenant_id);

    let q = supabase
      .from("posts")
      .update({ status: "published" })
      .eq("status", "scheduled")
      .lte("scheduled_at", now);
    if (lockedTenants.length > 0) {
      q = q.not("tenant_id", "in", `(${lockedTenants.join(",")})`);
    }
    const { data, error } = await q.select("id");

    if (error) {
      console.error("Error updating posts:", error);
      return new Response(
        JSON.stringify({ error: "An error occurred" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const count = data?.length || 0;
    console.log(`Auto-published ${count} posts at ${now}`);

    return new Response(
      JSON.stringify({ success: true, published_count: count }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in auto-publish:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
