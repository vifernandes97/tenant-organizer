import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook, PRICE_TO_PLAN } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

function lookupKeyFromItem(item: any): string | null {
  return (
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    null
  );
}

async function planIdFromCode(code: string | null): Promise<string | null> {
  if (!code) return null;
  const { data } = await getSupabase().from("plans").select("id").eq("code", code).maybeSingle();
  return (data as any)?.id ?? null;
}

async function applySubscription(subscription: any) {
  const tenantId = subscription.metadata?.tenant_id;
  if (!tenantId) {
    console.error("subscription has no tenant_id metadata", subscription.id);
    return;
  }

  // Respect plan_override
  const { data: existing } = await getSupabase()
    .from("tenant_subscriptions")
    .select("plan_override")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if ((existing as any)?.plan_override === true) {
    console.log(`tenant ${tenantId} has plan_override=true; ignoring webhook write`);
    return;
  }

  const item = subscription.items?.data?.[0];
  const lookupKey = lookupKeyFromItem(item);
  const planCode = lookupKey ? PRICE_TO_PLAN[lookupKey] : null;
  const planId = await planIdFromCode(planCode);

  const periodEnd =
    item?.current_period_end ?? subscription.current_period_end;

  await getSupabase()
    .from("tenant_subscriptions")
    .update({
      ...(planId && { plan_id: planId }),
      status: subscription.status,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenantId);
}

async function markPastDue(invoice: any) {
  const subId = invoice.subscription;
  if (!subId) return;
  await getSupabase()
    .from("tenant_subscriptions")
    .update({ status: "past_due", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subId);
}

async function markCanceled(subscription: any) {
  await getSupabase()
    .from("tenant_subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  // For subscription mode, Stripe will fire subscription.created right after.
  // We still proactively pull the subscription to set status quickly.
  if (session.mode !== "subscription" || !session.subscription) return;
  const { createStripeClient } = await import("../_shared/stripe.ts");
  const stripe = createStripeClient(env);
  const subscription = await stripe.subscriptions.retrieve(session.subscription, {
    expand: ["items.data.price"],
  });
  // Ensure metadata.tenant_id is present (it should be, from create-checkout)
  if (!subscription.metadata?.tenant_id && session.metadata?.tenant_id) {
    (subscription as any).metadata = { ...(subscription.metadata ?? {}), tenant_id: session.metadata.tenant_id };
  }
  await applySubscription(subscription);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("payments-webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object, env);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await applySubscription(event.data.object);
        break;
      case "customer.subscription.deleted":
        await markCanceled(event.data.object);
        break;
      case "invoice.payment_failed":
        await markPastDue(event.data.object);
        break;
      default:
        console.log("unhandled:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("payments-webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
