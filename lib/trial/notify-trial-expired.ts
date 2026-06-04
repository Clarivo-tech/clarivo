import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/admin/constants";
import { getAppBaseUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email/send";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  backfillUserPreferencesProfile,
  resolveCustomerProfileFromSources,
} from "@/lib/user-profile";
import {
  founderTrialExpiredEmail,
  trialExpiredEmail,
} from "@/lib/email/templates";

export type TrialExpiredPrefsRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  trial_expires_at: string | null;
  subscription_status: string | null;
  expiry_notified: boolean | null;
};

export function isEligibleForTrialExpiryNotify(
  prefs: TrialExpiredPrefsRow,
  now = Date.now()
): boolean {
  if (prefs.expiry_notified) {
    return false;
  }

  const status = (prefs.subscription_status ?? "trial").toLowerCase();
  if (status === "active") {
    return false;
  }

  const expiresAt = prefs.trial_expires_at
    ? new Date(prefs.trial_expires_at).getTime()
    : NaN;
  if (Number.isNaN(expiresAt) || expiresAt > now) {
    return false;
  }

  return true;
}

/** Sends expiry emails when env is configured; logs and returns false otherwise. */
export async function ensureTrialExpiryNotifications(
  userId: string
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[trial] Expiry emails skipped: RESEND_API_KEY is not set.");
    return false;
  }

  const admin = tryCreateAdminClient();
  if (!admin) {
    console.warn(
      "[trial] Expiry emails skipped: SUPABASE_SERVICE_ROLE_KEY is not set."
    );
    return false;
  }

  try {
    return await notifyTrialExpiredIfNeeded(admin, userId);
  } catch (error) {
    console.error("[trial] Expiry emails failed:", error);
    return false;
  }
}

export async function notifyTrialExpiredIfNeeded(
  admin: SupabaseClient,
  userId: string,
  prefs?: TrialExpiredPrefsRow | null
): Promise<boolean> {

  let row = prefs;
  if (!row) {
    const { data } = await admin
      .from("user_preferences")
      .select(
        "user_id, first_name, last_name, company, job_title, trial_expires_at, subscription_status, expiry_notified"
      )
      .eq("user_id", userId)
      .maybeSingle();
    row = data as TrialExpiredPrefsRow | null;
  }

  if (!row || !isEligibleForTrialExpiryNotify(row)) {
    console.log("[trial] Expiry emails skipped for user (not eligible):", userId, {
      expiry_notified: row?.expiry_notified,
      subscription_status: row?.subscription_status,
      trial_expires_at: row?.trial_expires_at,
    });
    return false;
  }

  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(userId);
  const email = userData?.user?.email?.trim();
  if (userError || !email) {
    return false;
  }

  const profile = resolveCustomerProfileFromSources(row, userData.user);
  await backfillUserPreferencesProfile(admin, userId, profile);

  const upgradeUrl = `${getAppBaseUrl()}/dashboard/upgrade`;

  const userTemplate = trialExpiredEmail({
    firstName: profile.firstName,
    upgradeUrl,
  });
  await sendEmail({
    to: email,
    subject: userTemplate.subject,
    html: userTemplate.html,
  });

  const founderTemplate = founderTrialExpiredEmail({
    customerName: profile.customerName,
    email,
    company: profile.company,
    jobTitle: profile.jobTitle,
    trialExpiresAt: row.trial_expires_at ?? new Date().toISOString(),
    upgradeUrl,
  });

  await sendEmail({
    to: PLATFORM_ADMIN_EMAIL,
    subject: founderTemplate.subject,
    html: founderTemplate.html,
  });

  console.log("[trial] Expiry emails sent for", email);

  const now = new Date().toISOString();
  await admin
    .from("user_preferences")
    .update({
      expiry_notified: true,
      subscription_status: "expired",
      trial_used: true,
      updated_at: now,
    })
    .eq("user_id", userId);

  return true;
}

export async function processExpiredTrialNotifications(
  admin: SupabaseClient
): Promise<number> {
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await admin
    .from("user_preferences")
    .select(
      "user_id, first_name, last_name, company, job_title, trial_expires_at, subscription_status, expiry_notified"
    )
    .lte("trial_expires_at", nowIso)
    .eq("expiry_notified", false)
    .neq("subscription_status", "active");

  if (error) {
    console.error("[trial] processExpiredTrialNotifications:", error.message);
    return 0;
  }

  let sent = 0;
  for (const row of rows ?? []) {
    const prefs = row as TrialExpiredPrefsRow;
    if (!isEligibleForTrialExpiryNotify(prefs)) {
      continue;
    }
    const ok = await notifyTrialExpiredIfNeeded(admin, prefs.user_id, prefs);
    if (ok) {
      sent += 1;
    }
  }

  return sent;
}
