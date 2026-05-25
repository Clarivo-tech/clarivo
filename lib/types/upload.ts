import type { Contract } from "@/lib/types/contracts";

export type UploadSuccessResponse = {
  success: true;
  status: "complete";
  contractId: string;
  contract?: Contract;
  contract_data?: unknown;
};
