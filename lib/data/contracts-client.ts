import { createClient } from "@/lib/supabase/client";
import { dedupeContractDataByContractId } from "@/lib/data/dedupe-contract-data";
import type { Contract, ContractData } from "@/lib/types/contracts";

export async function fetchContractsForCurrentUser(): Promise<Contract[]> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("[docs] fetch contracts failed:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as Contract[];
}

export async function fetchContractDataForCurrentUser(): Promise<
  ContractData[]
> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  const { data: contracts, error: contractsError } = await supabase
    .from("contracts")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (contractsError) {
    console.error("[chat] fetch contract ids failed:", contractsError.message);
    throw new Error(contractsError.message);
  }

  const contractIds = (contracts ?? []).map((c) => c.id);
  if (contractIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("contract_data")
    .select("*")
    .in("contract_id", contractIds);

  if (error) {
    console.error("[chat] fetch contract_data failed:", error.message);
    throw new Error(error.message);
  }

  return dedupeContractDataByContractId((data ?? []) as ContractData[]);
}
