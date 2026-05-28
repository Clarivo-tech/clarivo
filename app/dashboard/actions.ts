"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeCurrencyCode } from "@/lib/currency/currencies";
import { upsertBaseCurrency } from "@/lib/data/user-preferences";
import { getContractStoragePath } from "@/lib/storage/contract-path";
import type { ContractData } from "@/lib/types/contracts";

export async function updateDisplayName(
  displayName: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const trimmed = displayName.trim();
  if (!trimmed) {
    return { error: "Display name cannot be empty." };
  }

  const { error } = await supabase.auth.updateUser({
    data: { display_name: trimmed },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateBaseCurrency(
  baseCurrency: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const currency = normalizeCurrencyCode(baseCurrency);
  const result = await upsertBaseCurrency(supabase, user.id, currency);

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateContractValue(
  contractDataId: string,
  contractValue: number,
  currency: string
): Promise<{ error?: string; contractData?: ContractData }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  if (!Number.isFinite(contractValue) || contractValue < 0) {
    return { error: "Enter a valid contract value." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("contract_data")
    .select("id, contract_id")
    .eq("id", contractDataId)
    .single();

  if (fetchError || !existing) {
    return { error: "Contract data not found." };
  }

  const { data: ownedContract, error: contractError } = await supabase
    .from("contracts")
    .select("id")
    .eq("id", existing.contract_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (contractError || !ownedContract) {
    return { error: "You do not have permission to update this contract." };
  }

  const normalizedCurrency = normalizeCurrencyCode(currency);

  const { data, error } = await supabase
    .from("contract_data")
    .update({
      contract_value: contractValue,
      currency: normalizedCurrency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractDataId)
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { contractData: data as ContractData };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function deleteContract(
  contractId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: contract, error: fetchError } = await supabase
    .from("contracts")
    .select("storage_path, file_url")
    .eq("id", contractId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !contract) {
    return { error: "Contract not found." };
  }

  const storagePath = getContractStoragePath(contract);

  if (!storagePath) {
    return { error: "Contract file path not found." };
  }

  const { error: storageError } = await supabase.storage
    .from("contracts")
    .remove([storagePath]);

  if (storageError) {
    return { error: storageError.message };
  }

  const { error: deleteError } = await supabase
    .from("contracts")
    .delete()
    .eq("id", contractId)
    .eq("user_id", user.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/docs");
  revalidatePath("/dashboard/analytics");
  return {};
}

export async function toggleContractActiveStatus(
  contractId: string
): Promise<{ error?: string; is_active?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("contracts")
    .select("id, is_active")
    .eq("id", contractId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) {
    return { error: "Contract not found." };
  }

  const nextValue = !existing.is_active;

  const { error: updateError } = await supabase
    .from("contracts")
    .update({
      is_active: nextValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/docs");
  revalidatePath("/dashboard/analytics");
  return { is_active: nextValue };
}

export async function dismissRenewalAlert(
  contractDataId: string
): Promise<{ error?: string; contractData?: ContractData }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." };

  const { data: existing, error: fetchError } = await supabase
    .from("contract_data")
    .select("id, user_id")
    .eq("id", contractDataId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: "Renewal alert not found." };
  }

  const { data, error } = await supabase
    .from("contract_data")
    .update({
      renewal_alert_dismissed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractDataId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { contractData: data as ContractData };
}

export async function updateReminderPreferences(input: {
  remind_90_days: boolean;
  remind_60_days: boolean;
  remind_30_days: boolean;
  remind_14_days: boolean;
  remind_7_days: boolean;
  remind_renewal: boolean;
  remind_notice_deadline: boolean;
  remind_expiry: boolean;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      ...input,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return { error: error.message };

  revalidatePath("/dashboard/alerts");
  return { success: true };
}

export async function createCustomReminder(input: {
  contract_id: string;
  title: string;
  reminder_date: string;
  notes?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." };

  const title = input.title.trim();
  if (!title) return { error: "Reminder title is required." };

  const { error } = await supabase.from("reminders").insert({
    user_id: user.id,
    contract_id: input.contract_id,
    title,
    reminder_date: input.reminder_date,
    notes: input.notes?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/alerts");
  return { success: true };
}

export async function dismissCustomReminder(
  reminderId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase
    .from("reminders")
    .update({ dismissed: true })
    .eq("id", reminderId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/alerts");
  return { success: true };
}
