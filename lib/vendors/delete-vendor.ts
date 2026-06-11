import type { SupabaseClient } from "@supabase/supabase-js";

const VENDORS_BUCKET = "vendors";

export async function deleteVendorRecord(
  supabase: SupabaseClient,
  vendorId: string
): Promise<{ error?: string }> {
  await supabase
    .from("contracts")
    .update({ vendor_id: null })
    .eq("vendor_id", vendorId);

  const { data: docs } = await supabase
    .from("vendor_documents")
    .select("storage_path")
    .eq("vendor_id", vendorId);

  if (docs?.length) {
    await supabase.storage
      .from(VENDORS_BUCKET)
      .remove(docs.map((d) => d.storage_path as string));
  }

  const { error } = await supabase.from("vendors").delete().eq("id", vendorId);
  if (error) {
    return { error: error.message };
  }

  return {};
}

/** Remove vendor profile when no contracts still reference it. */
export async function deleteVendorIfNoLinkedContracts(
  supabase: SupabaseClient,
  vendorId: string | null | undefined
): Promise<{ deleted: boolean; error?: string }> {
  if (!vendorId) {
    return { deleted: false };
  }

  const { count, error: countError } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", vendorId);

  if (countError) {
    return { deleted: false, error: countError.message };
  }

  if ((count ?? 0) > 0) {
    return { deleted: false };
  }

  const result = await deleteVendorRecord(supabase, vendorId);
  if (result.error) {
    return { deleted: false, error: result.error };
  }

  return { deleted: true };
}
