import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { getOrgContextForTeam } from "@/lib/team/org";
import { UpgradePageClient } from "@/components/dashboard/upgrade-page-client";

export const dynamic = "force-dynamic";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [preferences, context] = await Promise.all([
    getUserPreferences(supabase, user.id),
    getOrgContextForTeam(supabase, user.id),
  ]);

  if (preferences.subscription_status === "active" && context?.isSubscribed) {
    redirect("/dashboard/team");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <UpgradePageClient
        organisationName={context?.organisationName ?? "your workspace"}
        currentLicenses={context?.seatLimit ?? 1}
        isOwner={context?.role === "owner"}
        paymentSuccess={payment === "success"}
      />
    </div>
  );
}
