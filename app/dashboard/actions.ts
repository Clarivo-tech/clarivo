"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/admin/constants";
import { createClient } from "@/lib/supabase/server";
import { normalizeCurrencyCode } from "@/lib/currency/currencies";
import {
  getUserPreferences,
  upsertBaseCurrency,
} from "@/lib/data/user-preferences";
import { sendEmail } from "@/lib/email/send";
import { founderSubscriptionCancellationRequestEmail } from "@/lib/email/templates";
import { getContractStoragePath } from "@/lib/storage/contract-path";
import { userCanAccessContract } from "@/lib/team/contract-access";
import { getOrgContextForTeam, getUserRole } from "@/lib/team/org";
import { canEditContracts } from "@/lib/team/roles";
import type { ContractData } from "@/lib/types/contracts";

async function assertCanEdit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ error?: string }> {
  const role = await getUserRole(supabase, userId);
  if (role && !canEditContracts(role)) {
    return { error: "You have read-only access." };
  }
  return {};
}

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

export async function requestSubscriptionCancellation(): Promise<{
  error?: string;
  success?: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const context = await getOrgContextForTeam(supabase, user.id);
  if (!context) {
    return { error: "Workspace not found." };
  }

  if (context.role !== "owner") {
    return { error: "Only the workspace owner can request cancellation." };
  }

  if (!context.isSubscribed) {
    return { error: "You do not have an active Pro subscription." };
  }

  const preferences = await getUserPreferences(supabase, user.id);
  const displayName =
    (user.user_metadata?.display_name as string | undefined)?.trim() ||
    [preferences.first_name, preferences.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user.email?.split("@")[0] ||
    "Customer";

  const template = founderSubscriptionCancellationRequestEmail({
    customerName: displayName,
    email: user.email ?? "",
    company: preferences.company?.trim() || context.organisationName,
    jobTitle: preferences.job_title,
    organisationName: context.organisationName,
    licenses: context.seatLimit,
    requestedAt: new Date().toISOString(),
  });

  try {
    await sendEmail({
      to: PLATFORM_ADMIN_EMAIL,
      subject: template.subject,
      html: template.html,
    });
  } catch (error) {
    console.error("[settings] cancellation request email failed:", error);
    return {
      error: "Could not send your cancellation request. Please email hello@clarivo-tech.com.",
    };
  }

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

  const editCheck = await assertCanEdit(supabase, user.id);
  if (editCheck.error) return editCheck;

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

  const canEdit = await userCanAccessContract(
    supabase,
    user.id,
    existing.contract_id,
    { requireEdit: true }
  );

  if (!canEdit) {
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

export type ContractDetailsInput = {
  vendorName: string;
  contractType: string;
  contractValue: number | null;
  currency: string;
  startDate: string | null;
  endDate: string | null;
  renewalDate: string | null;
  noticePeriodDays: number | null;
  autoRenews: boolean | null;
  summary: string;
};

function parseOptionalDate(value: string | null): string | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return value.trim();
}

export async function updateContractDetails(
  contractDataId: string,
  input: ContractDetailsInput
): Promise<{ error?: string; contractData?: ContractData }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const editCheck = await assertCanEdit(supabase, user.id);
  if (editCheck.error) return editCheck;

  const vendorName = input.vendorName.trim();
  if (!vendorName) {
    return { error: "Vendor name is required." };
  }

  if (
    input.contractValue != null &&
    (!Number.isFinite(input.contractValue) || input.contractValue < 0)
  ) {
    return { error: "Enter a valid contract value." };
  }

  if (
    input.noticePeriodDays != null &&
    (!Number.isInteger(input.noticePeriodDays) || input.noticePeriodDays < 0)
  ) {
    return { error: "Notice period must be a whole number of days." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("contract_data")
    .select("id, contract_id")
    .eq("id", contractDataId)
    .single();

  if (fetchError || !existing) {
    return { error: "Contract data not found." };
  }

  const canEdit = await userCanAccessContract(
    supabase,
    user.id,
    existing.contract_id,
    { requireEdit: true }
  );

  if (!canEdit) {
    return { error: "You do not have permission to update this contract." };
  }

  const { data, error } = await supabase
    .from("contract_data")
    .update({
      vendor_name: vendorName,
      contract_type: input.contractType.trim() || null,
      contract_value: input.contractValue,
      currency:
        input.contractValue != null
          ? normalizeCurrencyCode(input.currency)
          : null,
      start_date: parseOptionalDate(input.startDate),
      end_date: parseOptionalDate(input.endDate),
      renewal_date: parseOptionalDate(input.renewalDate),
      notice_period_days: input.noticePeriodDays,
      auto_renews: input.autoRenews,
      summary: input.summary.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractDataId)
    .select("*")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
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

  const editCheck = await assertCanEdit(supabase, user.id);
  if (editCheck.error) return editCheck;

  const canEdit = await userCanAccessContract(supabase, user.id, contractId, {
    requireEdit: true,
  });
  if (!canEdit) {
    return { error: "Contract not found." };
  }

  const { data: contract, error: fetchError } = await supabase
    .from("contracts")
    .select("storage_path, file_url")
    .eq("id", contractId)
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

  const editCheck = await assertCanEdit(supabase, user.id);
  if (editCheck.error) return editCheck;

  const canEdit = await userCanAccessContract(supabase, user.id, contractId, {
    requireEdit: true,
  });
  if (!canEdit) {
    return { error: "Contract not found." };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("contracts")
    .select("id, is_active")
    .eq("id", contractId)
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

  const editCheck = await assertCanEdit(supabase, user.id);
  if (editCheck.error) return editCheck;

  const { data: existing, error: fetchError } = await supabase
    .from("contract_data")
    .select("id, contract_id")
    .eq("id", contractDataId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { error: "Renewal alert not found." };
  }

  const canEdit = await userCanAccessContract(
    supabase,
    user.id,
    existing.contract_id,
    { requireEdit: true }
  );
  if (!canEdit) {
    return { error: "Renewal alert not found." };
  }

  const { data, error } = await supabase
    .from("contract_data")
    .update({
      renewal_alert_dismissed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractDataId)
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
