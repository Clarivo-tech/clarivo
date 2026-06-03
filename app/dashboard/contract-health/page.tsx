import { createClient } from "@/lib/supabase/server";
import {
  getContractDataByContractIds,
  getContracts,
} from "@/lib/data/contracts";
import { ContractHealthPageClient } from "@/components/dashboard/contract-health-page-client";

export const dynamic = "force-dynamic";

export default async function ContractHealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const contracts = await getContracts(supabase, user.id);
  const contractData = await getContractDataByContractIds(
    supabase,
    contracts.map((c) => c.id)
  );

  return <ContractHealthPageClient contractData={contractData} />;
}
