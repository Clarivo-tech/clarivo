import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UPGRADE_PAGE_PATH } from "@/lib/billing/payment-link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { TrialExpiryEnforcer } from "@/components/dashboard/trial-expiry-enforcer";
import { getUserPreferences } from "@/lib/data/user-preferences";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const preferences = await getUserPreferences(supabase, user.id);
  const isTrial = preferences.subscription_status !== "active";
  let trialExpiresAt = preferences.trial_expires_at;
  const fallbackFromUserCreatedAt = user.created_at
    ? new Date(new Date(user.created_at).getTime() + 5 * 60 * 1000).toISOString()
    : null;

  // Self-heal legacy/incomplete signup rows so the trial banner/countdown appears.
  if (isTrial && !trialExpiresAt) {
    const nowIso = new Date().toISOString();
    const fallbackExpiry =
      fallbackFromUserCreatedAt ?? new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: user.id,
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

  return (
    <DashboardShell
      userEmail={user.email ?? "Signed in"}
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
      <TrialExpiryEnforcer isTrial={isTrial} trialExpiresAt={trialExpiresAt} />
      {isTrial && remainingLabel ? (
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
