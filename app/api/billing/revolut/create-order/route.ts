import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  MAX_LICENSES,
  MIN_LICENSES,
  licensesToAmountPence,
} from "@/lib/billing/constants";
import {
  createRevolutCheckoutOrder,
  getAppBaseUrl,
  isRevolutConfigured,
} from "@/lib/billing/revolut";
import { getOrgContextForTeam } from "@/lib/team/org";

export async function POST(request: Request) {
  if (!isRevolutConfigured()) {
    return NextResponse.json(
      {
        error:
          "Revolut is not configured. Add REVOLUT_MERCHANT_API_SECRET to your environment.",
      },
      { status: 500 }
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Billing storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY to your environment.",
      },
      { status: 500 }
    );
  }

  const auth = await requireUser();
  if (!auth.user) return auth.response;

  let body: { licenses?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const licenses = Number(body.licenses);
  if (
    !Number.isInteger(licenses) ||
    licenses < MIN_LICENSES ||
    licenses > MAX_LICENSES
  ) {
    return NextResponse.json(
      {
        error: `Choose between ${MIN_LICENSES} and ${MAX_LICENSES} licenses.`,
      },
      { status: 400 }
    );
  }

  const context = await getOrgContextForTeam(auth.supabase, auth.user.id);
  if (!context || context.role !== "owner") {
    return NextResponse.json(
      { error: "Only the workspace owner can purchase licenses." },
      { status: 403 }
    );
  }

  const merchantReference = `clarivo-${context.organisationId}-${crypto.randomUUID()}`;
  const amountPence = licensesToAmountPence(licenses);
  const appBase = getAppBaseUrl();
  const redirectUrl = `${appBase}/dashboard/upgrade?payment=success`;

  const admin = createAdminClient();
  const { error: insertError } = await admin.from("billing_payments").insert({
    organisation_id: context.organisationId,
    user_id: auth.user.id,
    merchant_reference: merchantReference,
    licenses,
    amount_pence: amountPence,
    currency: "GBP",
    status: "pending",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    const order = await createRevolutCheckoutOrder({
      amountPence,
      currency: "GBP",
      description: `Clarivo Pro — ${licenses} license${licenses === 1 ? "" : "s"}`,
      customerEmail: auth.user.email ?? "",
      merchantReference,
      licenses,
      redirectUrl,
    });

    if (!order.checkout_url || !order.id) {
      return NextResponse.json(
        { error: "Revolut did not return a checkout URL." },
        { status: 502 }
      );
    }

    await admin
      .from("billing_payments")
      .update({
        revolut_order_id: order.id,
        updated_at: new Date().toISOString(),
      })
      .eq("merchant_reference", merchantReference);

    return NextResponse.json({
      checkoutUrl: order.checkout_url,
      orderId: order.id,
      merchantReference,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create Revolut order.";
    await admin
      .from("billing_payments")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("merchant_reference", merchantReference);

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
