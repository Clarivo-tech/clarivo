import type { InviteRole, OrganisationRole, StoredOrganisationRole } from "@/lib/team/types";

export const ROLE_LABELS: Record<OrganisationRole, string> = {
  owner: "Owner",
  member: "Member",
};

export function normalizeOrganisationRole(
  role: string | null | undefined
): OrganisationRole {
  return role === "owner" ? "owner" : "member";
}

export function displayRoleLabel(role: StoredOrganisationRole | string): string {
  return ROLE_LABELS[normalizeOrganisationRole(role)];
}

/** Change roles, remove members, and other owner-only team management. */
export function canManageTeam(role: OrganisationRole): boolean {
  return role === "owner";
}

/** Invite colleagues, view pending invites, and resend or cancel invitations. */
export function canInviteMembers(role: OrganisationRole): boolean {
  return role === "owner" || role === "member";
}

/** Purchase additional licenses on an existing subscription. */
export function canPurchaseLicenses(role: OrganisationRole): boolean {
  return role === "owner" || role === "member";
}

export function canUploadContracts(role: OrganisationRole): boolean {
  return true;
}

export function canEditContracts(role: OrganisationRole): boolean {
  return true;
}

export function canUseAiChat(role: OrganisationRole): boolean {
  return true;
}

export function roleBadgeClass(role: OrganisationRole): string {
  switch (role) {
    case "owner":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "member":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    default:
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  }
}

export function inviteRoleAccessDescription(_role: InviteRole): string {
  return "Can upload and manage contracts, invite teammates, add licenses, and use AI chat";
}

export function emailRoleAccessDescription(_role: InviteRole): string {
  return "Upload and manage contracts, invite teammates, add licenses, and use AI chat";
}
