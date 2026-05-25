import { createClient } from "@/lib/supabase/client";
import type { Contract } from "@/lib/types/contracts";

export async function fetchContractsForCurrentUser(): Promise<Contract[]> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return [];
  }

  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("[docs] fetch contracts failed:", error.message);
    throw new Error(error.message);
  }

  return (data ?? []) as Contract[];
}
