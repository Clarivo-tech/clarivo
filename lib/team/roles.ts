import type { InviteRole, OrganisationRole } from "@/lib/team/types";

export const ROLE_LABELS: Record<OrganisationRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const INVITE_ROLE_LABELS: Record<InviteRole, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export function canManageTeam(role: OrganisationRole): boolean {
  return role === "owner" || role === "admin";
}

export function canUploadContracts(role: OrganisationRole): boolean {
  return role !== "viewer";
}

export function canEditContracts(role: OrganisationRole): boolean {
  return role !== "viewer";
}

export function canUseAiChat(role: OrganisationRole): boolean {
  return role !== "viewer";
}

export function canInviteMembers(role: OrganisationRole): boolean {
  return role === "owner" || role === "admin";
}

export function roleBadgeClass(role: OrganisationRole): string {
  switch (role) {
    case "owner":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "admin":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "member":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "viewer":
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
    default:
      return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  }
}

export function inviteRoleAccessDescription(role: InviteRole): string {
  switch (role) {
    case "admin":
      return "Can invite users, manage contracts, and view all data";
    case "member":
      return "Can upload and manage contracts, and use AI chat";
    case "viewer":
      return "Read-only access to dashboard and contracts";
    default:
      return "";
  }
}

export function emailRoleAccessDescription(role: InviteRole): string {
  switch (role) {
    case "admin":
      return "Invite users, manage contracts, and view all organisation data";
    case "member":
      return "Upload and manage contracts, and use AI chat";
    case "viewer":
      return "Read-only access to the dashboard and contracts";
    default:
      return "";
  }
}
