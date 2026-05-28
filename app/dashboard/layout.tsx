import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
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
  const expiresAt = preferences.trial_expires_at
    ? new Date(preferences.trial_expires_at)
    : null;
  const daysRemaining = expiresAt
    ? Math.max(
        0,
        Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null;
  const urgentTrial = daysRemaining != null && daysRemaining <= 2;

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
      {isTrial && daysRemaining != null ? (
        <div
          className={
            urgentTrial
              ? "mb-6 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-red-800"
              : "mb-6 rounded-xl border border-orange-200/80 bg-orange-50 px-4 py-3 text-[#C2410C]"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="font-medium">
              ⏳ Your free trial expires in {daysRemaining}{" "}
              {daysRemaining === 1 ? "day" : "days"} — Upgrade to Pro
            </p>
            <Link
              href="/api/checkout"
              className={
                urgentTrial
                  ? "font-semibold text-red-700 underline underline-offset-2 hover:text-red-800"
                  : "font-semibold text-[#C2410C] underline underline-offset-2 hover:text-[#9A3412]"
              }
            >
              Upgrade now
            </Link>
          </div>
        </div>
      ) : null}
      {children}
    </DashboardShell>
  );
}
