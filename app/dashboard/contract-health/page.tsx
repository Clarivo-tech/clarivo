import { getDashboardSession } from "@/lib/auth/dashboard-session";
import {
  getContractDataByContractIds,
  getContracts,
} from "@/lib/data/contracts";
import { ContractHealthPageClient } from "@/components/dashboard/contract-health-page-client";

export const dynamic = "force-dynamic";

export default async function ContractHealthPage() {
  const { dataSupabase, effectiveUserId } = await getDashboardSession();

  const contracts = await getContracts(dataSupabase, effectiveUserId);
  const contractData = await getContractDataByContractIds(
    dataSupabase,
    contracts.map((c) => c.id)
  );

  return <ContractHealthPageClient contractData={contractData} />;
}
