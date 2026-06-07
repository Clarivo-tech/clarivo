import { UPGRADE_PAGE_PATH } from "@/lib/billing/payment-link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { TrialExpiryEnforcer } from "@/components/dashboard/trial-expiry-enforcer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { getOrgContextForTeam } from "@/lib/team/org";
import { bypassesTrialRestrictions } from "@/lib/admin/access";
import { ensureTrialExpiryNotifications } from "@/lib/trial/notify-trial-expired";
import {
  hasActiveWorkspace,
  isWorkspaceLocked,
  withFallbackTrialExpiry,
} from "@/lib/trial/workspace-access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dataSupabase, user, effectiveUserId, impersonating, isPlatformAdmin } =
    await getDashboardSession();

  const [preferences, context] = await Promise.all([
    getUserPreferences(dataSupabase, effectiveUserId),
    getOrgContextForTeam(dataSupabase, effectiveUserId),
  ]);

  let impersonationEmail: string | null = null;
  let effectiveUserCreatedAt = user.created_at;

  if (impersonating) {
    const admin = createAdminClient();
    const { data: target } = await admin.auth.admin.getUserById(effectiveUserId);
    impersonationEmail = target.user?.email ?? effectiveUserId;
    effectiveUserCreatedAt = target.user?.created_at ?? effectiveUserCreatedAt;
  }

  const operatorAccess = bypassesTrialRestrictions(user.email, impersonating);
  const workspaceActive =
    operatorAccess || hasActiveWorkspace(preferences, context);
  const isTrial = !workspaceActive;

  let trialExpiresAt = preferences.trial_expires_at;

  const fallbackFromUserCreatedAt = effectiveUserCreatedAt
    ? new Date(
        new Date(effectiveUserCreatedAt).getTime() + 5 * 60 * 1000
      ).toISOString()
    : null;

  if (isTrial && !trialExpiresAt) {
    const nowIso = new Date().toISOString();
    const fallbackExpiry =
      fallbackFromUserCreatedAt ??
      new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error } = await dataSupabase.from("user_preferences").upsert(
      {
        user_id: effectiveUserId,
        trial_started_at: preferences.trial_started_at ?? nowIso,
        trial_expires_at: fallbackExpiry,
        subscription_status: "trial",
        updated_at: nowIso,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("[dashboard-layout] trial banner fallback upsert failed:", error.message);
    }
    trialExpiresAt = fallbackExpiry;
  }

  const prefsForTrial = withFallbackTrialExpiry(
    {
      ...preferences,
      trial_expires_at: trialExpiresAt,
    },
    effectiveUserCreatedAt
  );

  if (!operatorAccess && !impersonating && !preferences.expiry_notified) {
    const locked = await isWorkspaceLocked(
      dataSupabase,
      effectiveUserId,
      prefsForTrial,
      effectiveUserCreatedAt
    );
    if (locked) {
      await ensureTrialExpiryNotifications(effectiveUserId);
    }
  }

  const expiresAtMs = trialExpiresAt ? new Date(trialExpiresAt).getTime() : null;
  const remainingMs =
    expiresAtMs == null ? null : Math.max(0, expiresAtMs - Date.now());
  const remainingMinutes =
    remainingMs == null ? null : Math.ceil(remainingMs / (1000 * 60));
  const remainingHours =
    remainingMs == null ? null : Math.ceil(remainingMs / (1000 * 60 * 60));
  const remainingDays =
    remainingMs == null ? null : Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const urgentTrial = remainingHours != null && remainingHours <= 48;

  const remainingLabel =
    remainingMinutes == null
      ? null
      : remainingMinutes < 60
        ? `${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`
        : remainingHours! < 24
          ? `${remainingHours} hour${remainingHours === 1 ? "" : "s"}`
          : `${remainingDays} day${remainingDays === 1 ? "" : "s"}`;

  const showTrialBanner =
    isTrial &&
    !impersonating &&
    remainingMs != null &&
    remainingMs > 0 &&
    remainingLabel != null;

  return (
    <DashboardShell
      userEmail={user.email ?? "Signed in"}
      isPlatformAdmin={isPlatformAdmin}
      logo={
        <img
          src="/clarivo-logo.png"
          alt="Clarivo"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            display: "inline-block",
          }}
        />
      }
    >
      <TrialExpiryEnforcer
        isTrial={isTrial}
        trialExpiresAt={trialExpiresAt}
        disabled={operatorAccess}
      />
      {impersonating && impersonationEmail ? (
        <ImpersonationBanner targetEmail={impersonationEmail} />
      ) : null}
      {showTrialBanner ? (
        <div
          className={
            urgentTrial
              ? "mb-6 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-red-800"
              : "mb-6 rounded-xl border border-orange-200/80 bg-orange-50 px-4 py-3 text-[#111827]"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="font-medium">
              ⏳ Your free trial expires in {remainingLabel} - Upgrade to Pro
            </p>
            <a
              href={UPGRADE_PAGE_PATH}
              className={
                urgentTrial
                  ? "font-semibold text-red-700 underline underline-offset-2 hover:text-red-800"
                  : "font-semibold text-[#111827] underline underline-offset-2 hover:text-[#111827]"
              }
            >
              Upgrade now
            </a>
          </div>
        </div>
      ) : null}
      {children}
    </DashboardShell>
  );
}
