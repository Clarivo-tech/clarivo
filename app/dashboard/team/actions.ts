"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { teamInviteEmail } from "@/lib/email/templates";
import { getOrgContextForTeam } from "@/lib/team/org";
import { validateTeamInvite } from "@/lib/team/validate-invite";
import {
  canInviteMembers,
  canManageTeam,
  emailRoleAccessDescription,
} from "@/lib/team/roles";
import type { InviteRole } from "@/lib/team/types";
import { getUserPreferences } from "@/lib/data/user-preferences";

function inviteAcceptBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl) return `${appUrl}/invite`;
  return "https://clarivo-tech.com/invite";
}

async function requireTeamInviter() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." as const };
  }

  const context = await getOrgContextForTeam(supabase, user.id);
  if (!context || !canInviteMembers(context.role)) {
    return { error: "You do not have permission to manage invitations." as const };
  }

  return { supabase, user, context };
}

async function requireTeamAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." as const };
  }

  const context = await getOrgContextForTeam(supabase, user.id);
  if (!context || !canManageTeam(context.role)) {
    return { error: "You do not have permission to manage team members." as const };
  }

  return { supabase, user, context };
}

export async function removeMember(
  memberId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireTeamAdmin();
  if ("error" in auth && auth.error) return { error: auth.error };

  const { data: member, error: fetchError } = await auth.supabase
    .from("organisation_members")
    .select("id, role, user_id")
    .eq("id", memberId)
    .eq("organisation_id", auth.context!.organisationId)
    .maybeSingle();

  if (fetchError || !member) {
    return { error: "Member not found." };
  }

  if (member.role === "owner") {
    return { error: "The owner cannot be removed." };
  }

  if (member.user_id === auth.user!.id) {
    return { error: "You cannot remove yourself." };
  }

  const { error } = await auth.supabase
    .from("organisation_members")
    .delete()
    .eq("id", memberId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team");
  return { success: true };
}

export async function cancelInvite(
  inviteId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireTeamInviter();
  if ("error" in auth && auth.error) return { error: auth.error };

  const { error } = await auth.supabase
    .from("invites")
    .update({ status: "cancelled" })
    .eq("id", inviteId)
    .eq("organisation_id", auth.context!.organisationId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/team");
  return { success: true };
}

export async function resendInvite(
  inviteId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireTeamInviter();
  if ("error" in auth && auth.error) return { error: auth.error };

  const { data: invite, error: fetchError } = await auth.supabase
    .from("invites")
    .select("id, email, role, token")
    .eq("id", inviteId)
    .eq("organisation_id", auth.context!.organisationId)
    .eq("status", "pending")
    .maybeSingle();

  if (fetchError || !invite) {
    return { error: "Invite not found." };
  }

  const validation = await validateTeamInvite(
    auth.supabase,
    auth.context!,
    invite.email as string,
    { excludeInviteId: inviteId }
  );
  if (!validation.ok) {
    return { error: validation.error };
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await auth.supabase
    .from("invites")
    .update({ token, expires_at: expiresAt })
    .eq("id", inviteId);

  if (updateError) return { error: updateError.message };

  const prefs = await getUserPreferences(auth.supabase, auth.user!.id);
  const inviterFirstName = prefs.first_name?.trim() || "Someone";
  const inviterLastName = prefs.last_name?.trim() || "";
  const inviterName = `${inviterFirstName} ${inviterLastName}`.trim();
  const role: InviteRole = "member";

  const template = teamInviteEmail({
    inviterFirstName,
    inviterName,
    organisationName: auth.context!.organisationName,
    role: "Member",
    roleDescription: emailRoleAccessDescription(role),
    acceptUrl: `${inviteAcceptBaseUrl()}/${token}`,
  });

  await sendEmail({
    to: invite.email as string,
    subject: template.subject,
    html: template.html,
  });

  revalidatePath("/dashboard/team");
  return { success: true };
}
