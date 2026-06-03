import { createClient } from "@/lib/supabase/server";
import { getTeamPageData } from "@/lib/team/data";
import { canManageTeam } from "@/lib/team/roles";
import { ensureUserOrganisation } from "@/lib/team/org";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { TeamPageClient } from "@/components/dashboard/team-page-client";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const preferences = await getUserPreferences(supabase, user.id);
  await ensureUserOrganisation(
    supabase,
    user.id,
    preferences.company,
    user.email
  );

  const { context, members, invites, licenses } = await getTeamPageData(
    supabase,
    user.id,
    user.email
  );

  const canManage = context ? canManageTeam(context.role) : false;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          My Team
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          See how many licenses you have purchased and utilised, then invite
          colleagues with your company email domain to join your organisation.
        </p>
      </div>

      <TeamPageClient
        context={context}
        members={members}
        invites={invites}
        licenses={licenses}
        canManage={canManage}
        currentUserId={user.id}
      />
    </div>
  );
}
