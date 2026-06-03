import type { SupabaseClient } from "@supabase/supabase-js";
import { extractEmailDomain } from "@/lib/team/email-domain";

export async function activateOrganisationLicenses(
  supabase: SupabaseClient,
  params: {
    organisationId: string;
    ownerUserId: string;
    ownerEmail: string | null | undefined;
    licenses: number;
  }
): Promise<{ error?: string }> {
  const ownerDomain = extractEmailDomain(params.ownerEmail ?? "");

  const { error: orgError } = await supabase
    .from("organisations")
    .update({
      plan: "pro",
      seat_limit: params.licenses,
      allowed_email_domain: ownerDomain || null,
    })
    .eq("id", params.organisationId);

  if (orgError) {
    return { error: orgError.message };
  }

  const { error: prefError } = await supabase
    .from("user_preferences")
    .update({
      subscription_status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", params.ownerUserId);

  if (prefError) {
    return { error: prefError.message };
  }

  return {};
}
