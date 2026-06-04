import type { SupabaseClient } from "@supabase/supabase-js";
import { dedupeContractDataByContractId } from "@/lib/data/dedupe-contract-data";
import { getContractData, getContracts } from "@/lib/data/contracts";
import { getOrganisationId } from "@/lib/team/org";
import { dedupeVendorsByName } from "@/lib/vendors/dedupe-vendors";
import { syncVendorsFromContracts } from "@/lib/vendors/sync-from-contracts";
import type { Contract, ContractData } from "@/lib/types/contracts";
import type {
  Vendor,
  VendorActivity,
  VendorDocument,
  VendorListRow,
  VendorStats,
} from "@/lib/types/vendors";

/** All vendor rows from the database (may include duplicate names). */
export async function listVendorRows(
  supabase: SupabaseClient,
  userId: string
): Promise<Vendor[]> {
  const organisationId = await getOrganisationId(supabase, userId);

  let query = supabase.from("vendors").select("*").order("name");

  if (organisationId) {
    query = query.or(
      `organisation_id.eq.${organisationId},and(organisation_id.is.null,user_id.eq.${userId})`
    );
  } else {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[vendors] listVendorRows:", error.message);
    return [];
  }
  return (data ?? []) as Vendor[];
}

/** One row per normalized vendor name (for UI lists and dropdowns). */
export async function getVendors(
  supabase: SupabaseClient,
  userId: string
): Promise<Vendor[]> {
  return dedupeVendorsByName(await listVendorRows(supabase, userId));
}

export async function getVendorById(
  supabase: SupabaseClient,
  userId: string,
  vendorId: string
): Promise<Vendor | null> {
  const vendors = await getVendors(supabase, userId);
  return vendors.find((v) => v.id === vendorId) ?? null;
}

export function buildVendorListRows(
  vendors: Vendor[],
  contracts: Contract[],
  contractData: ContractData[]
): VendorListRow[] {
  const deduped = dedupeContractDataByContractId(contractData);
  const dataByContract = new Map(deduped.map((r) => [r.contract_id, r]));

  return vendors.map((vendor) => {
    const linked = contracts.filter((c) => c.vendor_id === vendor.id);
    let totalSpend = 0;
    for (const c of linked) {
      const row = dataByContract.get(c.id);
      totalSpend += Number(row?.contract_value) || 0;
    }
    return {
      ...vendor,
      contractCount: linked.length,
      totalSpend,
    };
  });
}

export function computeVendorStats(rows: VendorListRow[]): VendorStats {
  return {
    totalVendors: rows.length,
    criticalVendors: rows.filter((v) => v.is_critical).length,
    highRiskVendors: rows.filter(
      (v) => v.risk_rating === "high" || v.risk_rating === "critical"
    ).length,
    totalVendorSpend: rows.reduce((sum, v) => sum + v.totalSpend, 0),
  };
}

export async function getVendorPageData(
  supabase: SupabaseClient,
  userId: string
) {
  await syncVendorsFromContracts(supabase, userId);

  const [vendors, contracts, allContractData] = await Promise.all([
    getVendors(supabase, userId),
    getContracts(supabase, userId),
    getContractData(supabase, userId),
  ]);

  const rows = buildVendorListRows(vendors, contracts, allContractData);
  const stats = computeVendorStats(rows);

  return { vendors, contracts, contractData: allContractData, rows, stats };
}

export async function getVendorDetailData(
  supabase: SupabaseClient,
  userId: string,
  vendorId: string
) {
  const vendor = await getVendorById(supabase, userId, vendorId);
  if (!vendor) return null;

  const [contracts, contractData, documents, activity] = await Promise.all([
    getContracts(supabase, userId),
    getContractData(supabase, userId),
    getVendorDocuments(supabase, vendorId),
    getVendorActivity(supabase, vendorId),
  ]);

  const linkedContracts = contracts.filter((c) => c.vendor_id === vendorId);
  const deduped = dedupeContractDataByContractId(contractData);
  const linkedData = deduped.filter((r) =>
    linkedContracts.some((c) => c.id === r.contract_id)
  );

  const unlinkedContracts = contracts.filter((c) => !c.vendor_id);
  const unlinkedData = deduped.filter((r) =>
    unlinkedContracts.some((c) => c.id === r.contract_id)
  );

  let totalSpend = 0;
  for (const row of linkedData) {
    totalSpend += Number(row.contract_value) || 0;
  }

  return {
    vendor,
    linkedContracts,
    linkedData,
    unlinkedContracts,
    unlinkedData,
    documents,
    activity,
    totalSpend,
  };
}

export async function getVendorDocuments(
  supabase: SupabaseClient,
  vendorId: string
): Promise<VendorDocument[]> {
  const { data, error } = await supabase
    .from("vendor_documents")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("[vendors] getVendorDocuments:", error.message);
    return [];
  }
  return (data ?? []) as VendorDocument[];
}

export async function getVendorActivity(
  supabase: SupabaseClient,
  vendorId: string
): Promise<VendorActivity[]> {
  const { data, error } = await supabase
    .from("vendor_activity")
    .select("*")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[vendors] getVendorActivity:", error.message);
    return [];
  }
  return (data ?? []) as VendorActivity[];
}

export function buildVendorIdByContractId(
  contracts: Contract[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of contracts) {
    if (c.vendor_id) map[c.id] = c.vendor_id;
  }
  return map;
}
