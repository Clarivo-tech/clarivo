import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_BASE_CURRENCY,
  normalizeCurrencyCode,
  type SupportedCurrency,
} from "@/lib/currency/currencies";

export type UserPreferences = {
  id: string;
  user_id: string;
  base_currency: SupportedCurrency;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export async function getUserPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[preferences] getUserPreferences:", error.message);
  }

  if (data) {
    return {
      ...(data as UserPreferences),
      base_currency: normalizeCurrencyCode(data.base_currency),
    };
  }

  return {
    id: "",
    user_id: userId,
    base_currency: DEFAULT_BASE_CURRENCY,
    display_name: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function upsertBaseCurrency(
  supabase: SupabaseClient,
  userId: string,
  baseCurrency: SupportedCurrency
): Promise<{ error?: string }> {
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      base_currency: baseCurrency,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[preferences] upsertBaseCurrency:", error.message);
    return { error: error.message };
  }

  return {};
}
