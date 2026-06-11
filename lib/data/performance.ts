import type { SupabaseClient } from "@supabase/supabase-js";
import { getContracts } from "@/lib/data/contracts";
import { getVendors } from "@/lib/data/vendors";
import { syncVendorsFromContracts } from "@/lib/vendors/sync-from-contracts";
import { vendorsWithLinkedContracts } from "@/lib/vendors/vendors-with-contracts";
import {
  calculateWeightedScore,
  scoreToRag,
  trendPercent,
} from "@/lib/performance/scoring";
import type {
  PerformanceCriteria,
  PerformancePageStats,
  PerformanceReview,
  ReviewWithVendor,
  VendorPerformanceOverview,
} from "@/lib/types/performance";
import type { Vendor } from "@/lib/types/vendors";

export async function getPerformanceCriteria(
  supabase: SupabaseClient,
  userId: string
): Promise<PerformanceCriteria[]> {
  const { data, error } = await supabase
    .from("performance_criteria")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[performance] getCriteria:", error.message);
    return [];
  }

  return (data ?? []) as PerformanceCriteria[];
}

export async function getPerformanceReviews(
  supabase: SupabaseClient,
  userId: string,
  vendorId?: string
): Promise<PerformanceReview[]> {
  let query = supabase
    .from("performance_reviews")
    .select("*")
    .eq("user_id", userId)
    .order("reviewed_at", { ascending: false });

  if (vendorId) {
    query = query.eq("vendor_id", vendorId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[performance] getReviews:", error.message);
    return [];
  }

  return (data ?? []) as PerformanceReview[];
}

export function buildVendorOverviews(
  vendors: Vendor[],
  reviews: PerformanceReview[]
): VendorPerformanceOverview[] {
  const byVendor = new Map<string, PerformanceReview[]>();

  for (const review of reviews) {
    const list = byVendor.get(review.vendor_id) ?? [];
    list.push(review);
    byVendor.set(review.vendor_id, list);
  }

  return vendors.map((vendor) => {
    const vendorReviews = (byVendor.get(vendor.id) ?? []).sort(
      (a, b) =>
        new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime()
    );
    const latest = vendorReviews[0];
    const previous = vendorReviews[1];
    const latestScore =
      latest?.overall_score != null
        ? Number(latest.overall_score)
        : vendor.performance_score != null
          ? Number(vendor.performance_score)
          : null;

    const previousScore =
      previous?.overall_score != null ? Number(previous.overall_score) : null;

    const rag =
      vendor.performance_rag && vendor.performance_rag !== "none"
        ? (vendor.performance_rag as VendorPerformanceOverview["rag"])
        : scoreToRag(latestScore);

    return {
      vendorId: vendor.id,
      vendorName: vendor.name,
      latestScore,
      previousScore,
      trendPercent: trendPercent(latestScore, previousScore),
      reviewCount: vendorReviews.length,
      lastReviewedAt:
        latest?.reviewed_at ?? vendor.last_reviewed_at ?? null,
      rag,
    };
  });
}

export function computePerformanceStats(
  overviews: VendorPerformanceOverview[],
  reviews: PerformanceReview[]
): PerformancePageStats {
  const scored = overviews.filter((o) => o.latestScore != null);
  const averagePortfolioScore =
    scored.length === 0
      ? null
      : Math.round(
          (scored.reduce((s, o) => s + (o.latestScore ?? 0), 0) / scored.length) *
            100
        ) / 100;

  let topPerformerName: string | null = null;
  let topPerformerScore: number | null = null;
  for (const row of scored) {
    if (
      row.latestScore != null &&
      (topPerformerScore == null || row.latestScore > topPerformerScore)
    ) {
      topPerformerScore = row.latestScore;
      topPerformerName = row.vendorName;
    }
  }

  const needsAttentionCount = scored.filter(
    (o) => (o.latestScore ?? 10) < 5
  ).length;

  return {
    averagePortfolioScore,
    topPerformerName,
    topPerformerScore,
    needsAttentionCount,
    totalReviews: reviews.length,
  };
}

export async function getRecentReviewsWithVendors(
  supabase: SupabaseClient,
  userId: string,
  limit = 10
): Promise<ReviewWithVendor[]> {
  const [reviews, vendors] = await Promise.all([
    getPerformanceReviews(supabase, userId),
    getVendors(supabase, userId),
  ]);

  const vendorById = new Map(vendors.map((v) => [v.id, v.name]));

  return reviews.slice(0, limit).map((r) => ({
    ...r,
    vendorName: vendorById.get(r.vendor_id) ?? "Unknown vendor",
  }));
}

export async function getVendorReviewHistory(
  supabase: SupabaseClient,
  userId: string,
  vendorId: string
): Promise<PerformanceReview[]> {
  return getPerformanceReviews(supabase, userId, vendorId);
}

export async function getPerformancePageData(
  supabase: SupabaseClient,
  userId: string,
  filterVendorId?: string
) {
  await syncVendorsFromContracts(supabase, userId);

  const [vendors, contracts, reviews, criteria] = await Promise.all([
    getVendors(supabase, userId),
    getContracts(supabase, userId, { includeInactive: true }),
    getPerformanceReviews(supabase, userId),
    getPerformanceCriteria(supabase, userId),
  ]);

  const activeVendorIds = new Set(
    vendorsWithLinkedContracts(vendors, contracts).map((vendor) => vendor.id)
  );
  const activeVendors = vendors.filter((vendor) => activeVendorIds.has(vendor.id));
  const activeReviews = reviews.filter((review) =>
    activeVendorIds.has(review.vendor_id)
  );

  const filteredVendors = filterVendorId
    ? activeVendors.filter((v) => v.id === filterVendorId)
    : activeVendors;

  const overviews = buildVendorOverviews(filteredVendors, activeReviews);
  const stats = computePerformanceStats(
    buildVendorOverviews(activeVendors, activeReviews),
    activeReviews
  );
  const recentReviews = (
    await getRecentReviewsWithVendors(supabase, userId, 12)
  ).filter((review) => activeVendorIds.has(review.vendor_id));

  return {
    vendors: filteredVendors,
    criteria,
    overviews,
    stats,
    recentReviews,
    allReviews: activeReviews,
  };
}

export { calculateWeightedScore };
