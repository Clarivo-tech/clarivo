import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { OrgContext, OrganisationRole } from "@/lib/team/types";

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

  return data.role as OrganisationRole;
}

export async function getOrgContext(
  supabase: SupabaseClient,
  userId: string
): Promise<OrgContext | null> {
  const organisationId = await getOrganisationId(supabase, userId);
  if (!organisationId) return null;

  const [orgResult, role] = await Promise.all([
    supabase
      .from("organisations")
      .select("id, name, plan, seat_limit, owner_id")
      .eq("id", organisationId)
      .maybeSingle(),
    getUserRole(supabase, userId, organisationId),
  ]);

  if (!orgResult.data) return null;

  const effectiveRole =
    role ??
    (orgResult.data.owner_id === userId
      ? ("owner" as OrganisationRole)
      : null);

  if (!effectiveRole) return null;

  return {
    organisationId,
    organisationName: orgResult.data.name as string,
    plan: (orgResult.data.plan as string) ?? "trial",
    seatLimit: Number(orgResult.data.seat_limit) || 1,
    role: effectiveRole,
  };
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
    .select("organisation_id")
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
    .select("id, name, plan, seat_limit, owner_id")
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

  const role =
    (member?.role as OrganisationRole | undefined) ??
    (org.owner_id === userId ? "owner" : null);

  if (!role) return null;

  return {
    organisationId,
    organisationName: org.name as string,
    plan: (org.plan as string) ?? "trial",
    seatLimit: Number(org.seat_limit) || 1,
    role,
  };
}

export async function ensureUserOrganisation(
  supabase: SupabaseClient,
  userId: string,
  companyName?: string | null
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
    supabase
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
