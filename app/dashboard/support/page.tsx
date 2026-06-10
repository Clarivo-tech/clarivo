import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { SupportPageClient } from "@/components/dashboard/support-page-client";
import { getUserPreferences } from "@/lib/data/user-preferences";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const { dataSupabase, user, effectiveUserId } = await getDashboardSession();
  const preferences = await getUserPreferences(dataSupabase, effectiveUserId);

  const displayName =
    preferences.display_name?.trim() ||
    [preferences.first_name, preferences.last_name].filter(Boolean).join(" ").trim() ||
    (user.user_metadata?.display_name as string | undefined)?.trim() ||
    "";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Support
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Tell us what went wrong and we&apos;ll get back to you as soon as we can.
        </p>
      </div>

      <SupportPageClient
        email={user.email ?? ""}
        displayName={displayName}
        company={preferences.company ?? ""}
      />
    </div>
  );
}
