import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";
import { MAX_LICENSES } from "@/lib/billing/constants";
import { isStripeConfigured } from "@/lib/billing/stripe";
import { updateSubscriptionLicenses } from "@/lib/billing/update-subscription-licenses";
import { getOrgContextForTeam } from "@/lib/team/org";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 500 }
    );
  }

  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const billingDb = tryCreateAdminClient() ?? auth.supabase;

  let body: { licenses?: number; additionalLicenses?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const context = await getOrgContextForTeam(
    auth.dataSupabase,
    auth.effectiveUserId
  );
  if (!context || context.role !== "owner") {
    return NextResponse.json(
      { error: "Only the workspace owner can purchase licenses." },
      { status: 403 }
    );
  }

  const currentTotal = Math.max(1, context.seatLimit);
  let newTotal: number;

  if (body.additionalLicenses != null) {
    const additional = Number(body.additionalLicenses);
    if (!Number.isInteger(additional) || additional < 1) {
      return NextResponse.json(
        { error: "Choose at least 1 additional license." },
        { status: 400 }
      );
    }
    newTotal = currentTotal + additional;
  } else {
    newTotal = Number(body.licenses);
  }

  if (!Number.isInteger(newTotal) || newTotal <= currentTotal || newTotal > MAX_LICENSES) {
    return NextResponse.json(
      {
        error: `Choose between 1 and ${MAX_LICENSES - currentTotal} additional license${MAX_LICENSES - currentTotal === 1 ? "" : "s"}.`,
      },
      { status: 400 }
    );
  }

  let billingUser = auth.user;
  if (auth.impersonating) {
    const admin = tryCreateAdminClient() ?? createAdminClient();
    const { data: owner } = await admin.auth.admin.getUserById(
      auth.effectiveUserId
    );
    if (owner.user) {
      billingUser = owner.user;
    }
  }

  const result = await updateSubscriptionLicenses({
    billingDb,
    user: billingUser,
    context,
    newTotal,
    ownerEmail: billingUser.email,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    mode: "subscription_updated",
    currentLicenses: result.currentLicenses,
    newTotal: result.newTotal,
    additionalLicenses: result.additionalLicenses,
  });
}
