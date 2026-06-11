import type { SupabaseClient } from "@supabase/supabase-js";
import { getContracts } from "@/lib/data/contracts";
import { getOrganisationId } from "@/lib/team/org";
import { deleteVendorRecord } from "@/lib/vendors/delete-vendor";

/** Remove vendor profiles that are not linked to any contract. */
export async function purgeOrphanedVendors(
  supabase: SupabaseClient,
  userId: string
): Promise<{ removed: number; error?: string }> {
  const organisationId = await getOrganisationId(supabase, userId);

  let vendorQuery = supabase.from("vendors").select("id");

  if (organisationId) {
    vendorQuery = vendorQuery.or(
      `organisation_id.eq.${organisationId},and(organisation_id.is.null,user_id.eq.${userId})`
    );
  } else {
    vendorQuery = vendorQuery.eq("user_id", userId);
  }

  const [{ data: vendors, error: vendorError }, contracts] = await Promise.all([
    vendorQuery,
    getContracts(supabase, userId, { includeInactive: true }),
  ]);

  if (vendorError) {
    return { removed: 0, error: vendorError.message };
  }

  const linkedVendorIds = new Set(
    contracts.map((contract) => contract.vendor_id).filter(Boolean) as string[]
  );

  let removed = 0;

  for (const vendor of vendors ?? []) {
    const vendorId = vendor.id as string;
    if (linkedVendorIds.has(vendorId)) {
      continue;
    }

    const result = await deleteVendorRecord(supabase, vendorId);
    if (result.error) {
      return { removed, error: result.error };
    }
    removed += 1;
  }

  return { removed };
}
