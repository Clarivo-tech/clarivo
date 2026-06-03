import { createAdminClient } from "@/lib/supabase/admin";

export type PublicInviteDetails = {
  token: string;
  email: string;
  role: string;
  organisationName: string;
  inviterName: string;
  allowedEmailDomain: string | null;
  expiresAt: string;
  valid: boolean;
  error?: string;
};

export async function getInviteByToken(
  token: string
): Promise<PublicInviteDetails | null> {
  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from("invites")
    .select("token, email, role, status, expires_at, invited_by, organisation_id")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) {
    return null;
  }

  const expired = new Date(invite.expires_at as string).getTime() < Date.now();
  const invalid = invite.status !== "pending" || expired;

  const { data: org } = await admin
    .from("organisations")
    .select("name, allowed_email_domain")
    .eq("id", invite.organisation_id as string)
    .maybeSingle();

  let inviterName = "A team member";
  if (invite.invited_by) {
    const { data: inviterPrefs } = await admin
      .from("user_preferences")
      .select("first_name, last_name")
      .eq("user_id", invite.invited_by as string)
      .maybeSingle();

    const first = (inviterPrefs?.first_name as string | undefined)?.trim() ?? "";
    const last = (inviterPrefs?.last_name as string | undefined)?.trim() ?? "";
    const combined = `${first} ${last}`.trim();
    if (combined) inviterName = combined;
  }

  return {
    token: invite.token as string,
    email: invite.email as string,
    role: invite.role as string,
    organisationName: (org?.name as string) ?? "your team",
    inviterName,
    allowedEmailDomain: (org?.allowed_email_domain as string | null) ?? null,
    expiresAt: invite.expires_at as string,
    valid: !invalid,
    error: expired
      ? "This invite has expired."
      : invite.status !== "pending"
        ? "This invite is no longer valid."
        : undefined,
  };
}
