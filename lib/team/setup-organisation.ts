import type { SupabaseClient } from "@supabase/supabase-js";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { extractEmailDomain } from "@/lib/team/email-domain";

export async function setupOrganisationForUser(
  userId: string,
  companyName: string,
  supabase?: SupabaseClient,
  ownerEmail?: string | null
): Promise<{ organisationId?: string; error?: string }> {
  const admin = tryCreateAdminClient();
  if (admin) {
    return setupOrganisationWithClient(admin, userId, companyName, ownerEmail);
  }

  if (!supabase) {
    return {
      error:
        "Server configuration incomplete. Add SUPABASE_SERVICE_ROLE_KEY to .env.local, or sign in and try again.",
    };
  }

  return setupOrganisationWithClient(supabase, userId, companyName, ownerEmail);
}

async function setupOrganisationWithClient(
  client: SupabaseClient,
  userId: string,
  companyName: string,
  ownerEmail?: string | null
): Promise<{ organisationId?: string; error?: string }> {
  const { data: existingPrefs } = await client
    .from("user_preferences")
    .select("organisation_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingPrefs?.organisation_id) {
    return { organisationId: existingPrefs.organisation_id as string };
  }

  const { data: existingMember } = await client
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingMember?.organisation_id) {
    await client
      .from("user_preferences")
      .update({
        organisation_id: existingMember.organisation_id,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    return { organisationId: existingMember.organisation_id as string };
  }

  const trimmedCompany = companyName.trim() || "My";
  const orgName = `${trimmedCompany} Workspace`;
  const allowedEmailDomain = extractEmailDomain(ownerEmail ?? "");

  const { data: org, error: orgError } = await client
    .from("organisations")
    .insert({
      name: orgName,
      owner_id: userId,
      plan: "trial",
      seat_limit: 1,
      allowed_email_domain: allowedEmailDomain,
    })
    .select("id")
    .single();

  if (orgError || !org) {
    return { error: orgError?.message ?? "Failed to create organisation." };
  }

  const organisationId = org.id as string;

  const { error: memberError } = await client.from("organisation_members").insert({
    organisation_id: organisationId,
    user_id: userId,
    role: "owner",
    status: "active",
  });

  if (memberError) {
    return { error: memberError.message };
  }

  const { error: prefError } = await client
    .from("user_preferences")
    .update({
      organisation_id: organisationId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (prefError) {
    return { error: prefError.message };
  }

  await client
    .from("contracts")
    .update({ organisation_id: organisationId })
    .eq("user_id", userId)
    .is("organisation_id", null);

  return { organisationId };
}
