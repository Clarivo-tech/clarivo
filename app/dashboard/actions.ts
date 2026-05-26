"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getContractStoragePath } from "@/lib/storage/contract-path";

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
  return {};
}
