import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { extractEmailDomain } from "@/lib/team/email-domain";
import { normalizeOrganisationRole } from "@/lib/team/roles";
import type { OrgContext, OrganisationRole, StoredOrganisationRole } from "@/lib/team/types";

function mapOrgContext(
  org: {
    id: string;
    name: string;
    plan: string;
    seat_limit: number;
    owner_id: string | null;
    allowed_email_domain?: string | null;
  },
  role: OrganisationRole,
  subscriptionStatus: string | null | undefined
): OrgContext {
  return {
    organisationId: org.id,
    organisationName: org.name,
    plan: org.plan ?? "trial",
    seatLimit: Number(org.seat_limit) || 1,
    role,
    allowedEmailDomain: org.allowed_email_domain ?? null,
    isSubscribed:
      subscriptionStatus === "active" ||
      (org.plan ?? "").toLowerCase() === "pro",
  };
}

export async function getOrganisationId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("organisation_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefs?.organisation_id) {
    return prefs.organisation_id as string;
  }

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (membership?.organisation_id as string | undefined) ?? null;
}

export async function getUserRole(
  supabase: SupabaseClient,
  userId: string,
  organisationId?: string | null
): Promise<OrganisationRole | null> {
  const orgId =
    organisationId ?? (await getOrganisationId(supabase, userId));
  if (!orgId) return null;

  const { data, error } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", orgId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data?.role) {
    return null;
  }

  return normalizeOrganisationRole(data.role as StoredOrganisationRole);
}

export async function getOrgContext(
  supabase: SupabaseClient,
  userId: string
): Promise<OrgContext | null> {
  const organisationId = await getOrganisationId(supabase, userId);
  if (!organisationId) return null;

  const [orgResult, role, prefResult] = await Promise.all([
    supabase
      .from("organisations")
      .select("id, name, plan, seat_limit, owner_id, allowed_email_domain")
      .eq("id", organisationId)
      .maybeSingle(),
    getUserRole(supabase, userId, organisationId),
    supabase
      .from("user_preferences")
      .select("subscription_status")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (!orgResult.data) return null;

  const effectiveRole =
    role ??
    (orgResult.data.owner_id === userId
      ? ("owner" as OrganisationRole)
      : null);

  if (!effectiveRole) return null;

  return mapOrgContext(
    orgResult.data as {
      id: string;
      name: string;
      plan: string;
      seat_limit: number;
      owner_id: string | null;
      allowed_email_domain?: string | null;
    },
    effectiveRole,
    prefResult.data?.subscription_status
  );
}

/** Team page / invites: service role when available, else session client. */
export async function getOrgContextForTeam(
  supabase: SupabaseClient,
  userId: string
): Promise<OrgContext | null> {
  const admin = tryCreateAdminClient();
  if (!admin) {
    return getOrgContext(supabase, userId);
  }

  return getOrgContextWithClient(admin, userId);
}

/** @deprecated Use getOrgContextForTeam */
export async function getOrgContextAdmin(
  userId: string
): Promise<OrgContext | null> {
  const admin = tryCreateAdminClient();
  if (!admin) return null;
  return getOrgContextWithClient(admin, userId);
}

async function getOrgContextWithClient(
  admin: SupabaseClient,
  userId: string
): Promise<OrgContext | null> {

  const { data: prefs } = await admin
    .from("user_preferences")
    .select("organisation_id, subscription_status")
    .eq("user_id", userId)
    .maybeSingle();

  let organisationId = prefs?.organisation_id as string | undefined;

  if (!organisationId) {
    const { data: membership } = await admin
      .from("organisation_members")
      .select("organisation_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    organisationId = membership?.organisation_id as string | undefined;
  }

  if (!organisationId) return null;

  const { data: org } = await admin
    .from("organisations")
    .select("id, name, plan, seat_limit, owner_id, allowed_email_domain")
    .eq("id", organisationId)
    .maybeSingle();

  if (!org) return null;

  const { data: member } = await admin
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const storedRole =
    (member?.role as StoredOrganisationRole | undefined) ??
    (org.owner_id === userId ? "owner" : null);

  if (!storedRole) return null;

  const role = normalizeOrganisationRole(storedRole);

  return mapOrgContext(
    org as {
      id: string;
      name: string;
      plan: string;
      seat_limit: number;
      owner_id: string | null;
      allowed_email_domain?: string | null;
    },
    role,
    prefs?.subscription_status
  );
}

export async function ensureUserOrganisation(
  supabase: SupabaseClient,
  userId: string,
  companyName?: string | null,
  ownerEmail?: string | null
): Promise<{ organisationId?: string; error?: string }> {
  const existing = await getOrgContextForTeam(supabase, userId);
  if (existing) {
    return { organisationId: existing.organisationId };
  }

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("company")
    .eq("user_id", userId)
    .maybeSingle();

  const { setupOrganisationForUser } = await import("@/lib/team/setup-organisation");
  return setupOrganisationForUser(
    userId,
    companyName?.trim() || (prefs?.company as string | undefined)?.trim() || "My",
    supabase,
    ownerEmail
  );
}

export async function countActiveSeats(
  supabase: SupabaseClient,
  organisationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("organisation_members")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .in("status", ["active", "pending"]);

  if (error) {
    console.error("[team] countActiveSeats:", error.message);
    return 0;
  }

  return count ?? 0;
}
