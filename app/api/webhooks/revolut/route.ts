import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  type RevolutWebhookPayload,
  verifyRevolutWebhookSignature,
} from "@/lib/billing/revolut";
import { fulfillBillingPayment } from "@/lib/billing/fulfill-payment";
import {
  fulfillBillingSubscription,
  markBillingSubscriptionCancelled,
  markBillingSubscriptionOverdue,
} from "@/lib/billing/fulfill-subscription";

export const runtime = "nodejs";

async function findPayment(
  admin: ReturnType<typeof createAdminClient>,
  payload: RevolutWebhookPayload
) {
  if (payload.order_id) {
    const byOrder = await admin
      .from("billing_payments")
      .select("*")
      .eq("revolut_order_id", payload.order_id)
      .maybeSingle();
    if (byOrder.data) return byOrder.data;
  }

  if (payload.merchant_order_ext_ref) {
    const byRef = await admin
      .from("billing_payments")
      .select("*")
      .eq("merchant_reference", payload.merchant_order_ext_ref)
      .maybeSingle();
    if (byRef.data) return byRef.data;
  }

  return null;
}

async function findSubscription(
  admin: ReturnType<typeof createAdminClient>,
  payload: RevolutWebhookPayload
) {
  if (payload.subscription_id) {
    const bySub = await admin
      .from("billing_subscriptions")
      .select("*")
      .eq("revolut_subscription_id", payload.subscription_id)
      .maybeSingle();
    if (bySub.data) return bySub.data;
  }

  if (payload.order_id) {
    const bySetupOrder = await admin
      .from("billing_subscriptions")
      .select("*")
      .eq("revolut_setup_order_id", payload.order_id)
      .maybeSingle();
    if (bySetupOrder.data) return bySetupOrder.data;
  }

  if (payload.merchant_order_ext_ref) {
    const byRef = await admin
      .from("billing_subscriptions")
      .select("*")
      .eq("merchant_reference", payload.merchant_order_ext_ref)
      .maybeSingle();
    if (byRef.data) return byRef.data;
  }

  return null;
}

export async function POST(request: Request) {
  const signingSecret = process.env.REVOLUT_WEBHOOK_SIGNING_SECRET?.trim();
  if (!signingSecret) {
    return NextResponse.json(
      { error: "REVOLUT_WEBHOOK_SIGNING_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 500 }
    );
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get("Revolut-Request-Timestamp");
  const signature = request.headers.get("Revolut-Signature");

  if (
    !verifyRevolutWebhookSignature({
      rawBody,
      timestamp,
      signatureHeader: signature,
      signingSecret,
    })
  ) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: RevolutWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RevolutWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const event = payload.event ?? "";
  const admin = createAdminClient();

  const subscription = await findSubscription(admin, payload);
  if (subscription) {
    if (payload.subscription_id && subscription.revolut_subscription_id !== payload.subscription_id) {
      await admin
        .from("billing_subscriptions")
        .update({
          revolut_subscription_id: payload.subscription_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);
      subscription.revolut_subscription_id = payload.subscription_id;
    }

    if (payload.order_id && subscription.revolut_setup_order_id !== payload.order_id) {
      await admin
        .from("billing_subscriptions")
        .update({
          revolut_setup_order_id: payload.order_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);
      subscription.revolut_setup_order_id = payload.order_id;
    }

    if (event === "SUBSCRIPTION_INITIATED") {
      const result = await fulfillBillingSubscription(admin, subscription, {
        revolutEvent: event,
        trustActive: true,
        revolutState: "active",
      });
      if (result.error) {
        console.error("[revolut-webhook] subscription fulfill failed:", result.error);
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ received: true, fulfilled: result.fulfilled });
    }

    if (event === "ORDER_COMPLETED" || event === "ORDER_AUTHORISED") {
      const result = await fulfillBillingSubscription(admin, subscription, {
        revolutEvent: event,
        trustActive: event === "ORDER_COMPLETED",
      });
      if (result.error) {
        console.error("[revolut-webhook] setup order fulfill failed:", result.error);
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ received: true, fulfilled: result.fulfilled });
    }

    if (event === "SUBSCRIPTION_OVERDUE") {
      await markBillingSubscriptionOverdue(admin, subscription, event);
      return NextResponse.json({ received: true, status: "overdue" });
    }

    if (event === "SUBSCRIPTION_CANCELLED") {
      await markBillingSubscriptionCancelled(admin, subscription, "cancelled", event);
      return NextResponse.json({ received: true, status: "cancelled" });
    }

    if (event === "SUBSCRIPTION_FINISHED") {
      await markBillingSubscriptionCancelled(admin, subscription, "finished", event);
      return NextResponse.json({ received: true, status: "finished" });
    }

    if (
      event === "ORDER_PAYMENT_FAILED" ||
      event === "ORDER_PAYMENT_DECLINED" ||
      event === "ORDER_FAILED" ||
      event === "ORDER_CANCELLED"
    ) {
      await admin
        .from("billing_subscriptions")
        .update({
          status: "failed",
          revolut_event: event,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id)
        .eq("status", "pending");

      return NextResponse.json({ received: true, status: "failed" });
    }

    return NextResponse.json({ received: true, ignored: true });
  }

  const payment = await findPayment(admin, payload);

  if (!payment) {
    return NextResponse.json({ received: true, matched: false });
  }

  if (payload.order_id && payment.revolut_order_id !== payload.order_id) {
    await admin
      .from("billing_payments")
      .update({
        revolut_order_id: payload.order_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);
    payment.revolut_order_id = payload.order_id;
  }

  if (event === "ORDER_COMPLETED" || event === "ORDER_AUTHORISED") {
    const result = await fulfillBillingPayment(admin, payment, {
      revolutEvent: event,
      trustPaid: event === "ORDER_COMPLETED",
    });
    if (result.error) {
      console.error("[revolut-webhook] fulfill failed:", result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ received: true, fulfilled: result.fulfilled });
  }

  if (
    event === "ORDER_PAYMENT_FAILED" ||
    event === "ORDER_PAYMENT_DECLINED" ||
    event === "ORDER_FAILED" ||
    event === "ORDER_CANCELLED"
  ) {
    await admin
      .from("billing_payments")
      .update({
        status: "failed",
        revolut_event: event,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .neq("status", "completed");

    return NextResponse.json({ received: true, status: "failed" });
  }

  return NextResponse.json({ received: true, ignored: true });
}
