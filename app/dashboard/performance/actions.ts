"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateWeightedScore } from "@/lib/performance/scoring";
import { scoreToRag } from "@/lib/performance/scoring";
import { getVendorById } from "@/lib/data/vendors";

async function requireAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };
  return { supabase, user };
}

export async function submitPerformanceReview(input: {
  vendorId: string;
  reviewPeriod?: string;
  notes?: string;
  scores: Array<{ criteriaId: string; score: number; notes?: string }>;
}): Promise<{ error?: string; overallScore?: number; vendorName?: string }> {
  const auth = await requireAuthUser();
  if ("error" in auth) return { error: auth.error };

  const vendor = await getVendorById(
    auth.supabase,
    auth.user.id,
    input.vendorId
  );
  if (!vendor) return { error: "Vendor not found." };

  const criteriaIds = input.scores.map((s) => s.criteriaId);
  const { data: criteriaRows } = await auth.supabase
    .from("performance_criteria")
    .select("id, weight, is_active")
    .eq("user_id", auth.user.id)
    .in("id", criteriaIds);

  const activeCriteria = (criteriaRows ?? []).filter((c) => c.is_active);
  if (activeCriteria.length === 0) {
    return { error: "No active criteria to score." };
  }

  const weightById = new Map(
    activeCriteria.map((c) => [c.id as string, Number(c.weight) || 1])
  );

  const weightedEntries = input.scores
    .filter((s) => weightById.has(s.criteriaId))
    .map((s) => ({
      score: s.score,
      weight: weightById.get(s.criteriaId) ?? 1,
    }));

  const overallScore = calculateWeightedScore(weightedEntries);
  const rag = scoreToRag(overallScore);
  const now = new Date().toISOString();

  const { data: review, error: reviewError } = await auth.supabase
    .from("performance_reviews")
    .insert({
      user_id: auth.user.id,
      vendor_id: input.vendorId,
      review_period: input.reviewPeriod?.trim() || null,
      overall_score: overallScore,
      notes: input.notes?.trim() || null,
      reviewed_at: now,
    })
    .select("id")
    .single();

  if (reviewError || !review) {
    return { error: reviewError?.message ?? "Could not save review." };
  }

  const scoreRows = input.scores
    .filter((s) => weightById.has(s.criteriaId))
    .map((s) => ({
      review_id: review.id,
      criteria_id: s.criteriaId,
      score: s.score,
      notes: s.notes?.trim() || null,
    }));

  const { error: scoresError } = await auth.supabase
    .from("performance_scores")
    .insert(scoreRows);

  if (scoresError) {
    return { error: scoresError.message };
  }

  const { error: vendorError } = await auth.supabase
    .from("vendors")
    .update({
      performance_score: overallScore,
      last_reviewed_at: now,
      performance_rag: rag,
      updated_at: now,
    })
    .eq("id", input.vendorId);

  if (vendorError) {
    return { error: vendorError.message };
  }

  await auth.supabase.from("vendor_activity").insert({
    vendor_id: input.vendorId,
    user_id: auth.user.id,
    action_type: "performance_review",
    description: `Performance review submitted — ${overallScore}/10`,
    metadata: { overall_score: overallScore, review_id: review.id },
  });

  revalidatePath("/dashboard/performance");
  revalidatePath("/dashboard/vendors");
  revalidatePath(`/dashboard/vendors/${input.vendorId}`);

  return {
    overallScore,
    vendorName: vendor.name,
  };
}

export async function toggleCriteriaActive(
  criteriaId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const auth = await requireAuthUser();
  if ("error" in auth) return { error: auth.error };

  const { error } = await auth.supabase
    .from("performance_criteria")
    .update({ is_active: isActive })
    .eq("id", criteriaId)
    .eq("user_id", auth.user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/performance");
  return {};
}

export async function updateCriteriaWeight(
  criteriaId: string,
  weight: number
): Promise<{ error?: string }> {
  const auth = await requireAuthUser();
  if ("error" in auth) return { error: auth.error };

  const w = Math.min(10, Math.max(1, Math.round(weight)));

  const { error } = await auth.supabase
    .from("performance_criteria")
    .update({ weight: w })
    .eq("id", criteriaId)
    .eq("user_id", auth.user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/performance");
  return {};
}

export async function addCustomCriteria(input: {
  name: string;
  description?: string;
  weight: number;
}): Promise<{ error?: string }> {
  const auth = await requireAuthUser();
  if ("error" in auth) return { error: auth.error };

  const name = input.name.trim();
  if (!name) return { error: "Name is required." };

  const { error } = await auth.supabase.from("performance_criteria").insert({
    user_id: auth.user.id,
    name,
    description: input.description?.trim() || null,
    is_default: false,
    is_active: true,
    weight: Math.min(10, Math.max(1, Math.round(input.weight))),
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/performance");
  return {};
}
