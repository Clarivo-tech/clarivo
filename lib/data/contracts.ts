import {
  addDays,
  endOfMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfToday,
} from "date-fns";
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

function isRenewalWithin30Days(renewalDate: string | null): boolean {
  if (!renewalDate) return false;
  const renewal = parseISO(renewalDate);
  const today = startOfToday();
  const in30 = addDays(today, 30);
  return renewal >= today && renewal <= in30;
}

export function computeDashboardStats(
  contracts: Contract[],
  contractData: ContractData[]
): DashboardStats {
  const today = startOfToday();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const totalSpend = contractData.reduce(
    (sum, row) => sum + (Number(row.contract_value) || 0),
    0
  );

  const renewalsThisMonth = contractData.filter((row) => {
    if (!row.renewal_date) return false;
    const renewal = parseISO(row.renewal_date);
    return isWithinInterval(renewal, { start: monthStart, end: monthEnd });
  }).length;

  const expiringSoon = contractData.filter((row) =>
    isRenewalWithin30Days(row.renewal_date)
  ).length;

  return {
    totalContracts: contracts.length,
    totalSpend,
    renewalsThisMonth,
    expiringSoon,
  };
}

export function getRenewalAlerts(
  contractData: ContractData[]
): ContractData[] {
  return contractData
    .filter((row) => isRenewalWithin30Days(row.renewal_date))
    .sort((a, b) => {
      if (!a.renewal_date || !b.renewal_date) return 0;
      return (
        parseISO(a.renewal_date).getTime() - parseISO(b.renewal_date).getTime()
      );
    });
}
