import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrganisationId } from "@/lib/team/org";
import { canEditContracts } from "@/lib/team/roles";
import type { OrganisationRole } from "@/lib/team/types";

export async function userCanAccessContract(
  supabase: SupabaseClient,
  userId: string,
  contractId: string,
  options?: { requireEdit?: boolean }
): Promise<boolean> {
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("id, user_id, organisation_id")
    .eq("id", contractId)
    .maybeSingle();

  if (error || !contract) return false;

  if (contract.user_id === userId) {
    if (!options?.requireEdit) return true;
    const role = await getRoleForContractCheck(supabase, userId);
    return role ? canEditContracts(role) : true;
  }

  const orgId = await getOrganisationId(supabase, userId);
  if (!orgId || contract.organisation_id !== orgId) {
    return false;
  }

  if (!options?.requireEdit) return true;

  const role = await getRoleForContractCheck(supabase, userId, orgId);
  return role ? canEditContracts(role) : false;
}

async function getRoleForContractCheck(
  supabase: SupabaseClient,
  userId: string,
  organisationId?: string
): Promise<OrganisationRole | null> {
  const orgId =
    organisationId ?? (await getOrganisationId(supabase, userId));
  if (!orgId) return "owner";

  const { data } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("organisation_id", orgId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return (data?.role as OrganisationRole | undefined) ?? null;
}
