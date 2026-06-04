import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

export type CustomerProfile = {
  firstName: string;
  lastName: string;
  customerName: string;
  company: string;
  jobTitle: string | null;
};

type PrefsSlice = {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  job_title?: string | null;
};

function readMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
): string {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

export function resolveCustomerProfileFromSources(
  prefs: PrefsSlice | null | undefined,
  owner: User | null | undefined,
  organisationName?: string | null
): CustomerProfile {
  const metadata = (owner?.user_metadata ?? {}) as Record<string, unknown>;

  const firstName =
    prefs?.first_name?.trim() ||
    readMetadataString(metadata, "first_name") ||
    "there";

  const lastName =
    prefs?.last_name?.trim() || readMetadataString(metadata, "last_name") || "";

  const company =
    prefs?.company?.trim() ||
    readMetadataString(metadata, "company") ||
    organisationName?.trim() ||
    "";

  const customerName =
    [firstName === "there" ? "" : firstName, lastName].filter(Boolean).join(" ") ||
    owner?.email?.split("@")[0] ||
    "Unknown";

  const jobTitle =
    prefs?.job_title?.trim() ||
    readMetadataString(metadata, "job_title") ||
    null;

  return {
    firstName,
    lastName,
    customerName,
    company: company || "—",
    jobTitle,
  };
}

export async function resolveCustomerProfile(
  admin: SupabaseClient,
  userId: string,
  options?: {
    prefs?: PrefsSlice | null;
    organisationId?: string;
  }
): Promise<CustomerProfile> {
  let prefs = options?.prefs;
  let organisationName: string | null = null;

  if (!prefs) {
    const { data } = await admin
      .from("user_preferences")
      .select("first_name, last_name, company, job_title")
      .eq("user_id", userId)
      .maybeSingle();
    prefs = data;
  }

  if (options?.organisationId) {
    const { data: org } = await admin
      .from("organisations")
      .select("name")
      .eq("id", options.organisationId)
      .maybeSingle();
    organisationName = org?.name ?? null;
  } else {
    const { data: membership } = await admin
      .from("organisation_members")
      .select("organisation_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("role", "owner")
      .limit(1)
      .maybeSingle();

    if (membership?.organisation_id) {
      const { data: org } = await admin
        .from("organisations")
        .select("name")
        .eq("id", membership.organisation_id)
        .maybeSingle();
      organisationName = org?.name ?? null;
    }
  }

  const { data: owner } = await admin.auth.admin.getUserById(userId);

  return resolveCustomerProfileFromSources(prefs, owner.user, organisationName);
}

/** Persist profile fields from auth metadata when preferences row is empty. */
export async function backfillUserPreferencesProfile(
  admin: SupabaseClient,
  userId: string,
  profile: CustomerProfile
): Promise<void> {
  if (profile.firstName === "there" && !profile.lastName && profile.company === "—") {
    return;
  }

  const { data: existing } = await admin
    .from("user_preferences")
    .select("first_name, last_name, company, job_title")
    .eq("user_id", userId)
    .maybeSingle();

  const patch: Record<string, string> = {};
  if (!existing?.first_name?.trim() && profile.firstName !== "there") {
    patch.first_name = profile.firstName;
  }
  if (!existing?.last_name?.trim() && profile.lastName) {
    patch.last_name = profile.lastName;
  }
  if (!existing?.company?.trim() && profile.company !== "—") {
    patch.company = profile.company;
  }
  if (!existing?.job_title?.trim() && profile.jobTitle) {
    patch.job_title = profile.jobTitle;
  }

  if (Object.keys(patch).length === 0) {
    return;
  }

  patch.updated_at = new Date().toISOString();

  await admin.from("user_preferences").update(patch).eq("user_id", userId);
}
