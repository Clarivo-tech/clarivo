import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getContractDataByContractIds,
  getContracts,
} from "@/lib/data/contracts";
import { dedupeContractDataByContractId } from "@/lib/data/dedupe-contract-data";
import { listVendorRows } from "@/lib/data/vendors";
import { consolidateDuplicateVendors } from "@/lib/vendors/dedupe-vendors";
import { normalizeVendorName } from "@/lib/vendors/constants";
import { ensureVendorForContract } from "@/lib/vendors/ensure-vendor";

/**
 * Ensures a vendors row exists for each distinct vendor_name on contract_data,
 * and links contracts.vendor_id. Safe to call on every performance/vendors load.
 */
export async function syncVendorsFromContracts(
  supabase: SupabaseClient,
  userId: string
): Promise<{ synced: number }> {
  const contracts = await getContracts(supabase, userId, {
    includeInactive: true,
  });
  if (contracts.length === 0) {
    return { synced: 0 };
  }

  const contractData = dedupeContractDataByContractId(
    await getContractDataByContractIds(
      supabase,
      contracts.map((c) => c.id)
    )
  );

  const contractsByVendorKey = new Map<
    string,
    { displayName: string; contractIds: string[] }
  >();

  for (const row of contractData) {
    const name = row.vendor_name?.trim();
    if (!name) continue;
    const key = normalizeVendorName(name);
    const entry = contractsByVendorKey.get(key) ?? {
      displayName: name,
      contractIds: [],
    };
    if (!entry.contractIds.includes(row.contract_id)) {
      entry.contractIds.push(row.contract_id);
    }
    contractsByVendorKey.set(key, entry);
  }

  let synced = 0;

  for (const { displayName, contractIds } of contractsByVendorKey.values()) {
    const primaryContractId = contractIds[0];
    const vendorId = await ensureVendorForContract(supabase, {
      userId,
      contractId: primaryContractId,
      vendorName: displayName,
    });

    if (!vendorId) continue;

    synced += 1;

    if (contractIds.length > 1) {
      await supabase
        .from("contracts")
        .update({ vendor_id: vendorId })
        .in("id", contractIds.slice(1));
    }
  }

  const vendors = await listVendorRows(supabase, userId);
  await consolidateDuplicateVendors(supabase, vendors);

  return { synced };
}
