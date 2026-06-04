export type PerformanceCriteria = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  weight: number;
  created_at: string;
};

export type PerformanceReview = {
  id: string;
  user_id: string;
  vendor_id: string;
  review_period: string | null;
  overall_score: number | null;
  notes: string | null;
  reviewed_at: string;
  created_at: string;
};

export type PerformanceScore = {
  id: string;
  review_id: string;
  criteria_id: string;
  score: number;
  notes: string | null;
  created_at: string;
};

export type VendorPerformanceOverview = {
  vendorId: string;
  vendorName: string;
  latestScore: number | null;
  previousScore: number | null;
  trendPercent: number | null;
  reviewCount: number;
  lastReviewedAt: string | null;
  rag: "none" | "green" | "amber" | "red";
};

export type PerformancePageStats = {
  averagePortfolioScore: number | null;
  topPerformerName: string | null;
  topPerformerScore: number | null;
  needsAttentionCount: number;
  totalReviews: number;
};

export type ReviewWithVendor = PerformanceReview & {
  vendorName: string;
};
