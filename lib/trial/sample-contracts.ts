export type TrialSampleContract = {
  id: string;
  label: string;
  description: string;
  fileName: string;
};

/** Drop matching PDFs into public/sample-contracts/ (see README there). */
export const TRIAL_SAMPLE_CONTRACTS: TrialSampleContract[] = [
  {
    id: "revforce-saas",
    label: "RevForce SaaS agreement",
    description: "Software subscription with renewal and notice period terms.",
    fileName: "revforce-saas-agreement.pdf",
  },
  {
    id: "financecore-services",
    label: "FinanceCore services contract",
    description: "Professional services agreement with value and key dates.",
    fileName: "financecore-services-contract.pdf",
  },
  {
    id: "datasync-support",
    label: "DataSync support renewal",
    description: "Support and maintenance contract with upcoming notice deadline.",
    fileName: "datasync-support-renewal.pdf",
  },
];

export function trialSampleContractPublicPath(fileName: string): string {
  return `/sample-contracts/${encodeURIComponent(fileName)}`;
}
