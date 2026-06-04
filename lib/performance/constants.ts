export const DEFAULT_PERFORMANCE_CRITERIA = [
  {
    name: "Service Delivery",
    description: "Is the vendor delivering as agreed?",
    weight: 8,
  },
  {
    name: "Communication & Responsiveness",
    description: "How quickly and clearly do they communicate?",
    weight: 7,
  },
  {
    name: "SLA Compliance",
    description: "Are they meeting the SLAs in the contract?",
    weight: 8,
  },
  {
    name: "Value for Money",
    description: "Are you getting good value for the cost?",
    weight: 6,
  },
  {
    name: "Contract Adherence",
    description: "Are they following the contract terms?",
    weight: 8,
  },
  {
    name: "Issue Resolution",
    description: "How well do they handle problems?",
    weight: 7,
  },
  {
    name: "Relationship Quality",
    description: "How is the overall working relationship?",
    weight: 6,
  },
] as const;

export const CRITERIA_WEIGHT_MIN = 1;
export const CRITERIA_WEIGHT_MAX = 10;
export const PERFORMANCE_SCORE_MIN = 1;
export const PERFORMANCE_SCORE_MAX = 10;

export const RAG_COLORS = {
  green: "#22c55e",
  amber: "#F97316",
  red: "#ef4444",
} as const;
