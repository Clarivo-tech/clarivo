import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeVendorName } from "@/lib/vendors/constants";
import type { Vendor } from "@/lib/types/vendors";

/** Prefer the vendor row that already has review data or was created first. */
export function pickCanonicalVendor(group: Vendor[]): Vendor {
  return [...group].sort((a, b) => {
    const aScored = a.performance_score != null ? 1 : 0;
    const bScored = b.performance_score != null ? 1 : 0;
    if (bScored !== aScored) return bScored - aScored;
    return (
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  })[0];
}

/** One row per normalized vendor name for lists and dropdowns. */
export function dedupeVendorsByName(vendors: Vendor[]): Vendor[] {
  const byKey = new Map<string, Vendor>();

  for (const vendor of vendors) {
    const key = normalizeVendorName(vendor.name);
    const existing = byKey.get(key);
    if (!existing || pickCanonicalVendor([vendor, existing]).id === vendor.id) {
      byKey.set(key, vendor);
    }
  }

  return Array.from(byKey.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Merges duplicate vendor rows (same normalized name) into a single canonical row.
 */
export async function consolidateDuplicateVendors(
  supabase: SupabaseClient,
  vendors: Vendor[]
): Promise<void> {
  const groups = new Map<string, Vendor[]>();

  for (const vendor of vendors) {
    const key = normalizeVendorName(vendor.name);
    const list = groups.get(key) ?? [];
    list.push(vendor);
    groups.set(key, list);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) continue;

    const canonical = pickCanonicalVendor(group);
    const duplicates = group.filter((v) => v.id !== canonical.id);

    const scored = group.find((v) => v.performance_score != null);
    if (
      scored &&
      scored.id !== canonical.id &&
      canonical.performance_score == null
    ) {
      await supabase
        .from("vendors")
        .update({
          performance_score: scored.performance_score,
          last_reviewed_at: scored.last_reviewed_at,
          performance_rag: scored.performance_rag,
          updated_at: new Date().toISOString(),
        })
        .eq("id", canonical.id);
    }

    for (const dupe of duplicates) {
      await supabase
        .from("contracts")
        .update({ vendor_id: canonical.id })
        .eq("vendor_id", dupe.id);

      await supabase
        .from("performance_reviews")
        .update({ vendor_id: canonical.id })
        .eq("vendor_id", dupe.id);

      await supabase
        .from("vendor_documents")
        .update({ vendor_id: canonical.id })
        .eq("vendor_id", dupe.id);

      await supabase
        .from("vendor_activity")
        .update({ vendor_id: canonical.id })
        .eq("vendor_id", dupe.id);

      const { error } = await supabase.from("vendors").delete().eq("id", dupe.id);
      if (error) {
        console.error(
          "[vendors] consolidate delete:",
          dupe.id,
          error.message
        );
      }
    }
  }
}
