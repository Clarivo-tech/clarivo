"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrganisationId } from "@/lib/team/org";
import { getVendorById } from "@/lib/data/vendors";
import type { VendorFormInput, VendorRiskRating, VendorStatus } from "@/lib/types/vendors";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." as const };
  return { supabase, user };
}

function parseTags(tags?: string): string[] | null {
  if (!tags?.trim()) return null;
  const parsed = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return parsed.length ? parsed : null;
}

function formToRow(input: VendorFormInput, userId: string, organisationId: string | null) {
  return {
    user_id: userId,
    organisation_id: organisationId,
    name: input.name.trim(),
    website: input.website?.trim() || null,
    company_registration: input.companyRegistration?.trim() || null,
    address: input.address?.trim() || null,
    country: input.country?.trim() || "United Kingdom",
    industry: input.industry?.trim() || null,
    vendor_type: input.vendorType?.trim() || null,
    status: (input.status ?? "active") as VendorStatus,
    risk_rating: (input.riskRating ?? "medium") as VendorRiskRating,
    is_critical: input.isCritical ?? false,
    is_single_source: input.isSingleSource ?? false,
    account_manager_name: input.accountManagerName?.trim() || null,
    account_manager_email: input.accountManagerEmail?.trim() || null,
    account_manager_phone: input.accountManagerPhone?.trim() || null,
    support_contact_name: input.supportContactName?.trim() || null,
    support_contact_email: input.supportContactEmail?.trim() || null,
    escalation_contact_name: input.escalationContactName?.trim() || null,
    escalation_contact_email: input.escalationContactEmail?.trim() || null,
    notes: input.notes?.trim() || null,
    tags: parseTags(input.tags),
    auto_created: false,
    updated_at: new Date().toISOString(),
  };
}

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vendorId: string,
  userId: string,
  actionType: string,
  description: string
) {
  await supabase.from("vendor_activity").insert({
    vendor_id: vendorId,
    user_id: userId,
    action_type: actionType,
    description,
  });
}

export async function createVendor(
  input: VendorFormInput
): Promise<{ error?: string; vendorId?: string }> {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return { error: auth.error };

  if (!input.name?.trim()) {
    return { error: "Vendor name is required." };
  }

  const organisationId = await getOrganisationId(auth.supabase, auth.user.id);
  const row = formToRow(input, auth.user.id, organisationId);

  const { data, error } = await auth.supabase
    .from("vendors")
    .insert(row)
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logActivity(
    auth.supabase,
    data.id,
    auth.user.id,
    "vendor_created",
    `Vendor "${row.name}" created.`
  );

  revalidatePath("/dashboard/vendors");
  return { vendorId: data.id };
}

export async function updateVendor(
  vendorId: string,
  input: VendorFormInput
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return { error: auth.error };

  const vendor = await getVendorById(auth.supabase, auth.user.id, vendorId);
  if (!vendor) return { error: "Vendor not found." };

  if (!input.name?.trim()) {
    return { error: "Vendor name is required." };
  }

  const row = formToRow(input, auth.user.id, vendor.organisation_id);
  const { error } = await auth.supabase
    .from("vendors")
    .update({
      ...row,
      user_id: vendor.user_id,
      organisation_id: vendor.organisation_id,
      auto_created: false,
    })
    .eq("id", vendorId);

  if (error) return { error: error.message };

  await logActivity(
    auth.supabase,
    vendorId,
    auth.user.id,
    "vendor_updated",
    `Vendor profile updated.`
  );

  revalidatePath("/dashboard/vendors");
  revalidatePath(`/dashboard/vendors/${vendorId}`);
  return { success: true };
}

export async function deleteVendor(
  vendorId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return { error: auth.error };

  const vendor = await getVendorById(auth.supabase, auth.user.id, vendorId);
  if (!vendor) return { error: "Vendor not found." };

  await auth.supabase
    .from("contracts")
    .update({ vendor_id: null })
    .eq("vendor_id", vendorId);

  const { data: docs } = await auth.supabase
    .from("vendor_documents")
    .select("storage_path")
    .eq("vendor_id", vendorId);

  if (docs?.length) {
    await auth.supabase.storage
      .from("vendors")
      .remove(docs.map((d) => d.storage_path as string));
  }

  const { error } = await auth.supabase.from("vendors").delete().eq("id", vendorId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/vendors");
  return { success: true };
}

export async function updateVendorNotes(
  vendorId: string,
  notes: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return { error: auth.error };

  const vendor = await getVendorById(auth.supabase, auth.user.id, vendorId);
  if (!vendor) return { error: "Vendor not found." };

  const { error } = await auth.supabase
    .from("vendors")
    .update({
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vendorId);

  if (error) return { error: error.message };

  await logActivity(
    auth.supabase,
    vendorId,
    auth.user.id,
    "notes_edited",
    "Vendor notes updated."
  );

  revalidatePath(`/dashboard/vendors/${vendorId}`);
  return { success: true };
}

export async function linkContractToVendor(
  vendorId: string,
  contractId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return { error: auth.error };

  const vendor = await getVendorById(auth.supabase, auth.user.id, vendorId);
  if (!vendor) return { error: "Vendor not found." };

  const { error } = await auth.supabase
    .from("contracts")
    .update({ vendor_id: vendorId })
    .eq("id", contractId);

  if (error) return { error: error.message };

  await logActivity(
    auth.supabase,
    vendorId,
    auth.user.id,
    "contract_linked",
    "Contract linked to this vendor."
  );

  revalidatePath(`/dashboard/vendors/${vendorId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getVendorDocumentSignedUrl(
  documentId: string,
  vendorId: string
): Promise<{ error?: string; url?: string }> {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return { error: auth.error };

  const vendor = await getVendorById(auth.supabase, auth.user.id, vendorId);
  if (!vendor) return { error: "Vendor not found." };

  const { data: doc } = await auth.supabase
    .from("vendor_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (!doc?.storage_path) return { error: "Document not found." };

  const { data, error } = await auth.supabase.storage
    .from("vendors")
    .createSignedUrl(doc.storage_path as string, 3600);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Could not generate download link." };
  }

  return { url: data.signedUrl };
}

export async function deleteVendorDocument(
  documentId: string,
  vendorId: string
): Promise<{ error?: string; success?: boolean }> {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return { error: auth.error };

  const { data: doc } = await auth.supabase
    .from("vendor_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (!doc) return { error: "Document not found." };

  await auth.supabase.storage.from("vendors").remove([doc.storage_path as string]);
  const { error } = await auth.supabase
    .from("vendor_documents")
    .delete()
    .eq("id", documentId);

  if (error) return { error: error.message };

  await logActivity(
    auth.supabase,
    vendorId,
    auth.user.id,
    "document_deleted",
    "Vendor document removed."
  );

  revalidatePath(`/dashboard/vendors/${vendorId}`);
  return { success: true };
}
