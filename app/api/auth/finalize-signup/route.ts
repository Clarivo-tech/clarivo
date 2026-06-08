import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/api/auth";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { setupOrganisationForUser } from "@/lib/team/setup-organisation";

const SIGNUP_WINDOW_MS = 15 * 60 * 1000;

type FinalizeBody = {
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  contactNumber?: string;
  paidSignup?: boolean;
};

async function upsertSignupPreferences(
  db: SupabaseClient,
  params: {
    userId: string;
    body: FinalizeBody;
    paidSignup: boolean;
  }
): Promise<{ error?: string }> {
  const now = new Date();
  const trialExpiresAt = new Date(now);
  trialExpiresAt.setMinutes(trialExpiresAt.getMinutes() + 5);

  const preferencesBase = {
    user_id: params.userId,
    first_name: params.body.firstName?.trim() ?? null,
    last_name: params.body.lastName?.trim() ?? null,
    company: params.body.company?.trim() ?? null,
    job_title: params.body.jobTitle?.trim() ?? null,
    trial_started_at: params.paidSignup ? null : now.toISOString(),
    trial_expires_at: params.paidSignup ? null : trialExpiresAt.toISOString(),
    subscription_status: params.paidSignup ? "pending_payment" : "trial",
    trial_used: params.paidSignup ? false : true,
    updated_at: now.toISOString(),
  };

  const withContact = await db.from("user_preferences").upsert(
    {
      ...preferencesBase,
      contact_number: params.body.contactNumber?.trim() ?? null,
    },
    { onConflict: "user_id" }
  );

  if (withContact.error?.message?.toLowerCase().includes("contact_number")) {
    const fallback = await db
      .from("user_preferences")
      .upsert(preferencesBase, { onConflict: "user_id" });
    if (fallback.error) {
      return { error: fallback.error.message };
    }
  } else if (withContact.error) {
    return { error: withContact.error.message };
  }

  return {};
}

export async function POST(request: Request) {
  let body: FinalizeBody;
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

  const paidSignup = body.paidSignup !== false;
  const auth = await requireUser();

  if (auth.user && auth.user.id === userId) {
    if ((auth.user.email ?? "").toLowerCase() !== email) {
      return NextResponse.json({ error: "Email mismatch." }, { status: 403 });
    }

    const prefResult = await upsertSignupPreferences(auth.supabase, {
      userId,
      body,
      paidSignup,
    });
    if (prefResult.error) {
      return NextResponse.json({ error: prefResult.error }, { status: 500 });
    }

    const orgResult = await setupOrganisationForUser(
      userId,
      body.company?.trim() || "My",
      auth.supabase,
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

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Please confirm your email, then sign in to continue to payment. If this persists, contact hello@clarivo-tech.com.",
      },
      { status: 500 }
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
      { error: "Signup finalization window has expired. Please sign in." },
      { status: 403 }
    );
  }

  const prefResult = await upsertSignupPreferences(admin, {
    userId,
    body,
    paidSignup,
  });
  if (prefResult.error) {
    return NextResponse.json({ error: prefResult.error }, { status: 500 });
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
