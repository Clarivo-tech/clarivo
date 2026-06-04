import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PERFORMANCE_CRITERIA } from "@/lib/performance/constants";

export async function ensureDefaultPerformanceCriteria(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { count, error: countError } = await supabase
    .from("performance_criteria")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    console.error("[performance] count criteria:", countError.message);
    return;
  }

  if ((count ?? 0) > 0) return;

  const rows = DEFAULT_PERFORMANCE_CRITERIA.map((c) => ({
    user_id: userId,
    name: c.name,
    description: c.description,
    is_default: true,
    is_active: true,
    weight: c.weight,
  }));

  const { error } = await supabase.from("performance_criteria").insert(rows);

  if (error) {
    console.error("[performance] seed criteria:", error.message);
  }
}
