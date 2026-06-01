import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrgContext, TeamInvite, TeamMemberRow } from "@/lib/team/types";
import { ensureUserOrganisation, getOrgContextForTeam } from "@/lib/team/org";

export async function getTeamPageData(
  supabase: SupabaseClient,
  userId: string,
  currentUserEmail?: string | null
): Promise<{
  context: OrgContext | null;
  members: TeamMemberRow[];
  invites: TeamInvite[];
  seatsUsed: number;
  adminConfigured: boolean;
}> {
  await ensureUserOrganisation(supabase, userId);
  const context = await getOrgContextForTeam(supabase, userId);
  if (!context) {
    return {
      context: null,
      members: [],
      invites: [],
      seatsUsed: 0,
      adminConfigured: Boolean(tryCreateAdminClient()),
    };
  }

  const admin = tryCreateAdminClient();
  const db = admin ?? supabase;

  const [{ data: membersRaw }, { data: invitesRaw }] = await Promise.all([
    db
      .from("organisation_members")
      .select("id, user_id, role, invited_email, status, joined_at")
      .eq("organisation_id", context.organisationId)
      .order("joined_at", { ascending: true }),
    db
      .from("invites")
      .select("*")
      .eq("organisation_id", context.organisationId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const memberUserIds = (membersRaw ?? [])
    .map((m) => m.user_id as string | null)
    .filter((id): id is string => Boolean(id));

  const { data: prefs } =
    memberUserIds.length > 0
      ? await db
          .from("user_preferences")
          .select("user_id, first_name, last_name")
          .in("user_id", memberUserIds)
      : { data: [] };

  const prefsByUser = new Map(
    (prefs ?? []).map((p) => [p.user_id as string, p])
  );

  const emailByUser = new Map<string, string>();
  if (admin) {
    for (const memberUserId of memberUserIds) {
      const { data: userData } = await admin.auth.admin.getUserById(memberUserId);
      if (userData.user?.email) {
        emailByUser.set(memberUserId, userData.user.email);
      }
    }
  } else if (currentUserEmail) {
    emailByUser.set(userId, currentUserEmail);
  }

  const members: TeamMemberRow[] = (membersRaw ?? []).map((row) => {
    const memberUserId = row.user_id as string | null;
    const pref = memberUserId ? prefsByUser.get(memberUserId) : null;
    const firstName = (pref?.first_name as string | undefined)?.trim() || "";
    const lastName = (pref?.last_name as string | undefined)?.trim() || "";
    const email =
      (memberUserId ? emailByUser.get(memberUserId) : null) ??
      (row.invited_email as string | undefined) ??
      "";

    return {
      id: row.id as string,
      userId: memberUserId,
      firstName,
      lastName,
      email,
      role: row.role as TeamMemberRow["role"],
      status: row.status === "pending" ? "pending" : "active",
      joinedAt: row.joined_at as string,
    };
  });

  const seatsUsed =
    members.filter((m) => m.status === "active").length +
    (invitesRaw ?? []).length;

  return {
    context,
    members,
    invites: (invitesRaw ?? []) as TeamInvite[],
    seatsUsed,
    adminConfigured: Boolean(admin),
  };
}
