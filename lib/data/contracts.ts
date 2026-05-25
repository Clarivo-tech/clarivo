import { addDays, parseISO, startOfToday } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Contract,
  ContractData,
  DashboardStats,
} from "@/lib/types/contracts";

export async function getContracts(
  supabase: SupabaseClient,
  userId: string
): Promise<Contract[]> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("[dashboard] getContracts:", error.message);
    return [];
  }

  return (data ?? []) as Contract[];
}

/** Fetch contract_data by contract IDs only — no user_id filter on contract_data. */
export async function getContractDataByContractIds(
  supabase: SupabaseClient,
  contractIds: string[]
): Promise<ContractData[]> {
  if (contractIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("contract_data")
    .select("*")
    .in("contract_id", contractIds)
    .order("renewal_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[dashboard] getContractDataByContractIds:", error.message);
    return [];
  }

  return (data ?? []) as ContractData[];
}

export async function getContractData(
  supabase: SupabaseClient,
  userId: string
): Promise<ContractData[]> {
  const contracts = await getContracts(supabase, userId);
  return getContractDataByContractIds(
    supabase,
    contracts.map((c) => c.id)
  );
}

function isRenewalWithinDays(
  renewalDate: string | null,
  days: number
): boolean {
  if (!renewalDate) return false;
  const renewal = parseISO(renewalDate);
  const today = startOfToday();
  const end = addDays(today, days);
  return renewal >= today && renewal <= end;
}

export function computeDashboardStats(
  contracts: Contract[],
  contractData: ContractData[]
): DashboardStats {
  const totalValue = contractData.reduce(
    (sum, row) => sum + (Number(row.contract_value) || 0),
    0
  );

  const renewalsThisYear = contractData.filter((row) =>
    isRenewalWithinDays(row.renewal_date, 365)
  ).length;

  const expiringSoon = contractData.filter((row) =>
    isRenewalWithinDays(row.renewal_date, 30)
  ).length;

  return {
    totalContracts: contracts.length,
    totalValue,
    renewalsThisYear,
    expiringSoon,
  };
}

export function getRenewalAlerts(
  contractData: ContractData[]
): ContractData[] {
  return contractData
    .filter((row) => isRenewalWithinDays(row.renewal_date, 30))
    .sort((a, b) => {
      if (!a.renewal_date || !b.renewal_date) return 0;
      return (
        parseISO(a.renewal_date).getTime() - parseISO(b.renewal_date).getTime()
      );
    });
}
