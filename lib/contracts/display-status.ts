import type { Contract, ContractFileStatus } from "@/lib/types/contracts";

const PROCESSING_TIMEOUT_MS = 2 * 60 * 1000;

export type ContractUiState = {
  /** Badge status to render */
  displayStatus: ContractFileStatus;
  showExtractingSpinner: boolean;
  showRetry: boolean;
};

export function getContractUiState(contract: Contract): ContractUiState {
  const { status } = contract;
  const uploadedAt = new Date(contract.uploaded_at).getTime();
  const isStaleProcessing =
    status === "processing" && Date.now() - uploadedAt > PROCESSING_TIMEOUT_MS;

  if (status === "complete" || status === "completed") {
    return {
      displayStatus: "complete",
      showExtractingSpinner: false,
      showRetry: false,
    };
  }

  if (status === "failed" || isStaleProcessing) {
    return {
      displayStatus: "failed",
      showExtractingSpinner: false,
      showRetry: true,
    };
  }

  if (status === "processing") {
    return {
      displayStatus: "processing",
      showExtractingSpinner: true,
      showRetry: false,
    };
  }

  return {
    displayStatus: status,
    showExtractingSpinner: false,
    showRetry: false,
  };
}
