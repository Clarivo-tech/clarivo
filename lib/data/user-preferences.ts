import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_BASE_CURRENCY,
  normalizeCurrencyCode,
  type SupportedCurrency,
} from "@/lib/currency/currencies";

export type UserPreferences = {
  id: string;
  user_id: string;
  organisation_id: string | null;
  base_currency: SupportedCurrency;
  display_name: string | null;
  trial_started_at: string | null;
  trial_expires_at: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  job_title: string | null;
  contact_number: string | null;
  reminder_sent: boolean | null;
  expiry_notified: boolean | null;
  trial_documents_hint_dismissed: boolean | null;
  remind_90_days: boolean | null;
  remind_60_days: boolean | null;
  remind_30_days: boolean | null;
  remind_14_days: boolean | null;
  remind_7_days: boolean | null;
  remind_renewal: boolean | null;
  remind_notice_deadline: boolean | null;
  remind_expiry: boolean | null;
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
    organisation_id: null,
    base_currency: DEFAULT_BASE_CURRENCY,
    display_name: null,
    trial_started_at: null,
    trial_expires_at: null,
    subscription_status: "trial",
    stripe_customer_id: null,
    stripe_subscription_id: null,
    first_name: null,
    last_name: null,
    company: null,
    job_title: null,
    contact_number: null,
    reminder_sent: false,
    expiry_notified: false,
    trial_documents_hint_dismissed: false,
    remind_90_days: true,
    remind_60_days: true,
    remind_30_days: true,
    remind_14_days: false,
    remind_7_days: false,
    remind_renewal: true,
    remind_notice_deadline: true,
    remind_expiry: true,
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
