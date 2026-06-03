import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emailMatchesOrganisationDomain,
  formatDomainHint,
} from "@/lib/team/email-domain";
import { canAllocateLicense, computeLicenseSummary } from "@/lib/team/licenses";
import type { OrgContext } from "@/lib/team/types";

export async function validateTeamInvite(
  supabase: SupabaseClient,
  context: OrgContext,
  inviteEmail: string,
  options?: { excludeInviteId?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!context.isSubscribed) {
    return {
      ok: false,
      error:
        "Upgrade your workspace to purchase licenses before inviting team members.",
    };
  }

  const email = inviteEmail.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!emailMatchesOrganisationDomain(email, context.allowedEmailDomain)) {
    return {
      ok: false,
      error: `Team members must use your company email domain (${formatDomainHint(context.allowedEmailDomain)}).`,
    };
  }

  let inviteQuery = supabase
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", context.organisationId)
    .eq("status", "pending");

  if (options?.excludeInviteId) {
    inviteQuery = inviteQuery.neq("id", options.excludeInviteId);
  }

  const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
    supabase
      .from("organisation_members")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", context.organisationId)
      .eq("status", "active"),
    inviteQuery,
  ]);

  const licenses = computeLicenseSummary(
    memberCount ?? 0,
    inviteCount ?? 0,
    context.seatLimit
  );

  if (!canAllocateLicense(licenses)) {
    return {
      ok: false,
      error: `All ${licenses.purchased} licenses are in use. Upgrade or cancel a pending invite to add someone else.`,
    };
  }

  const { data: existingMember } = await supabase
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", context.organisationId)
    .eq("invited_email", email)
    .maybeSingle();

  if (existingMember) {
    return { ok: false, error: "This person is already on your team." };
  }

  const { data: existingInvite } = await supabase
    .from("invites")
    .select("id")
    .eq("organisation_id", context.organisationId)
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return { ok: false, error: "An invitation is already pending for this email." };
  }

  return { ok: true };
}
