import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { setupOrganisationForUser } from "@/lib/team/setup-organisation";

const SIGNUP_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Server configuration incomplete. Add SUPABASE_SERVICE_ROLE_KEY to your environment.",
      },
      { status: 500 }
    );
  }

  let body: {
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    jobTitle?: string;
    contactNumber?: string;
    paidSignup?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const email = body.email?.trim().toLowerCase();

  if (!userId || !email) {
    return NextResponse.json(
      { error: "userId and email are required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: authUser, error: authError } =
    await admin.auth.admin.getUserById(userId);

  if (authError || !authUser.user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if ((authUser.user.email ?? "").toLowerCase() !== email) {
    return NextResponse.json({ error: "Email mismatch." }, { status: 403 });
  }

  const createdAt = authUser.user.created_at
    ? new Date(authUser.user.created_at).getTime()
    : NaN;

  if (!Number.isFinite(createdAt) || Date.now() - createdAt > SIGNUP_WINDOW_MS) {
    return NextResponse.json(
      { error: "Signup finalization window has expired." },
      { status: 403 }
    );
  }

  const paidSignup = body.paidSignup !== false;
  const now = new Date();
  const trialExpiresAt = new Date(now);
  trialExpiresAt.setMinutes(trialExpiresAt.getMinutes() + 5);

  const preferencesBase = {
    user_id: userId,
    first_name: body.firstName?.trim() ?? null,
    last_name: body.lastName?.trim() ?? null,
    company: body.company?.trim() ?? null,
    job_title: body.jobTitle?.trim() ?? null,
    trial_started_at: paidSignup ? null : now.toISOString(),
    trial_expires_at: paidSignup ? null : trialExpiresAt.toISOString(),
    subscription_status: paidSignup ? "pending_payment" : "trial",
    trial_used: paidSignup ? false : true,
    updated_at: now.toISOString(),
  };

  const withContact = await admin
    .from("user_preferences")
    .upsert(
      {
        ...preferencesBase,
        contact_number: body.contactNumber?.trim() ?? null,
      },
      { onConflict: "user_id" }
    );

  if (withContact.error?.message?.toLowerCase().includes("contact_number")) {
    const fallback = await admin
      .from("user_preferences")
      .upsert(preferencesBase, { onConflict: "user_id" });
    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }
  } else if (withContact.error) {
    return NextResponse.json({ error: withContact.error.message }, { status: 500 });
  }

  const orgResult = await setupOrganisationForUser(
    userId,
    body.company?.trim() || "My",
    admin,
    email
  );

  if (orgResult.error) {
    return NextResponse.json({ error: orgResult.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    organisationId: orgResult.organisationId,
    paidSignup,
  });
}
