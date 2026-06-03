import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrganisationId } from "@/lib/team/org";
import { normalizeVendorName } from "@/lib/vendors/constants";
import type { Vendor } from "@/lib/types/vendors";

async function logVendorActivity(
  supabase: SupabaseClient,
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

export async function findVendorByName(
  supabase: SupabaseClient,
  userId: string,
  vendorName: string
): Promise<Vendor | null> {
  const trimmed = vendorName.trim();
  if (!trimmed) return null;

  const organisationId = await getOrganisationId(supabase, userId);
  const normalized = normalizeVendorName(trimmed);

  let query = supabase.from("vendors").select("*");

  if (organisationId) {
    query = query.eq("organisation_id", organisationId);
  } else {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error || !data?.length) return null;

  const match = (data as Vendor[]).find(
    (v) => normalizeVendorName(v.name) === normalized
  );
  return match ?? null;
}

export async function ensureVendorForContract(
  supabase: SupabaseClient,
  params: {
    userId: string;
    contractId: string;
    vendorName: string | null;
  }
): Promise<string | null> {
  const name = params.vendorName?.trim();
  if (!name) return null;

  const existing = await findVendorByName(supabase, params.userId, name);
  if (existing) {
    await supabase
      .from("contracts")
      .update({ vendor_id: existing.id })
      .eq("id", params.contractId);

    await logVendorActivity(
      supabase,
      existing.id,
      params.userId,
      "contract_linked",
      `Contract linked to vendor "${existing.name}".`
    );
    return existing.id;
  }

  const organisationId = await getOrganisationId(supabase, params.userId);

  const { data: created, error } = await supabase
    .from("vendors")
    .insert({
      user_id: params.userId,
      organisation_id: organisationId,
      name,
      status: "active",
      risk_rating: "medium",
      auto_created: true,
    })
    .select("*")
    .single();

  if (error || !created) {
    console.error("[vendors] ensureVendorForContract:", error?.message);
    return null;
  }

  const vendor = created as Vendor;

  await supabase
    .from("contracts")
    .update({ vendor_id: vendor.id })
    .eq("id", params.contractId);

  await logVendorActivity(
    supabase,
    vendor.id,
    params.userId,
    "vendor_created",
    `Vendor "${vendor.name}" auto-created from contract upload.`
  );

  await logVendorActivity(
    supabase,
    vendor.id,
    params.userId,
    "contract_linked",
    `Contract linked to vendor "${vendor.name}".`
  );

  return vendor.id;
}
