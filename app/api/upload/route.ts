import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/api/auth";
import { requireCanUpload, requireOrgRole } from "@/lib/api/require-role";
import { getOrganisationId } from "@/lib/team/org";
import { userCanAccessContract } from "@/lib/team/contract-access";
import {
  callClaudeWithPdf,
  deriveDataStatus,
  extractSimplePdfText,
  parseExtractedJson,
} from "@/lib/extraction/pipeline";
import { ensureVendorForContract } from "@/lib/vendors/ensure-vendor";
import { resolveContractFileUrl } from "@/lib/storage/contract-file-url";
import { getContractStoragePath } from "@/lib/storage/contract-path";
import type { Contract } from "@/lib/types/contracts";

export const maxDuration = 120;

const BUCKET = "contracts";

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-() ]/g, "_");
}

function jsonError(step: string, message: string, status = 500) {
  console.error(`[upload] FAILED step=${step}`, message);
  return NextResponse.json({ success: false, error: message, step }, { status });
}

async function markFailed(
  supabase: SupabaseClient,
  contractId: string
) {
  try {
    await supabase
      .from("contracts")
      .update({ status: "failed" })
      .eq("id", contractId);
  } catch (e) {
    console.error("[upload] mark failed error", e);
  }
}

async function downloadPdfBuffer(
  supabase: SupabaseClient,
  storagePath: string
): Promise<Buffer> {
  console.log("[upload] step=download_pdf", { storagePath });

  const { data: blob, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);

  if (!error && blob) {
    const buffer = Buffer.from(await blob.arrayBuffer());
    console.log("[upload] download ok", { bytes: buffer.length });
    return buffer;
  }

  console.log("[upload] download via signed URL fallback", error?.message);

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60);

  if (signError || !signed?.signedUrl) {
    throw new Error(signError?.message ?? "Could not create signed URL.");
  }

  const res = await fetch(signed.signedUrl);
  if (!res.ok) {
    throw new Error(`Signed URL fetch failed: ${res.status}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  console.log("[upload] signed download ok", { bytes: buffer.length });
  return buffer;
}

async function runExtractionPipeline(
  supabase: SupabaseClient,
  contractId: string,
  userId: string,
  pdfBuffer: Buffer
) {
  console.log("[upload] step=extract_text", { bytes: pdfBuffer.length });
  const previewText = extractSimplePdfText(pdfBuffer);
  console.log("[upload] simple text preview", {
    charCount: previewText.length,
    preview: previewText.slice(0, 200),
  });

  console.log("[upload] step=base64_encode");
  const pdfBase64 = pdfBuffer.toString("base64");
  console.log("[upload] base64 ready", { length: pdfBase64.length });

  console.log("[upload] step=claude_api");
  const claudeText = await callClaudeWithPdf(pdfBase64);
  console.log("[upload] claude ok", { responseLength: claudeText.length });

  console.log("[upload] step=parse_json");
  const extracted = parseExtractedJson(claudeText);
  const dataStatus = deriveDataStatus(
    extracted.end_date,
    extracted.renewal_date
  );

  console.log("[upload] step=insert_contract_data", {
    vendor_name: extracted.vendor_name,
    contract_value: extracted.contract_value,
  });

  await supabase.from("contract_data").delete().eq("contract_id", contractId);

  const row: Record<string, unknown> = {
    contract_id: contractId,
    user_id: userId,
    vendor_name: extracted.vendor_name,
    contract_value: extracted.contract_value,
    currency: extracted.currency,
    start_date: extracted.start_date,
    end_date: extracted.end_date,
    renewal_date: extracted.renewal_date,
    notice_period_days: extracted.notice_period_days,
    contract_type: extracted.contract_type,
    summary: extracted.summary,
    status: dataStatus,
  };

  if (extracted.auto_renews !== null) {
    row.auto_renews = extracted.auto_renews;
    row.auto_renewal = extracted.auto_renews;
  }

  const { data: contractData, error: insertError } = await supabase
    .from("contract_data")
    .insert(row)
    .select("*")
    .single();

  if (insertError) {
    throw new Error(`insert_contract_data: ${insertError.message}`);
  }

  if (extracted.vendor_name?.trim()) {
    await ensureVendorForContract(supabase, {
      userId,
      contractId,
      vendorName: extracted.vendor_name,
    });
  }

  console.log("[upload] step=update_contract_status", { contractId, userId });

  const contractRecord = { id: contractId };

  let { data: updatedRows, error: updateError } = await supabase
    .from("contracts")
    .update({
      status: "complete",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contractRecord.id)
    .eq("user_id", userId)
    .select("id, status");

  console.log("[upload] update result", { updateError, updatedRows });

  if (
    updateError?.message?.includes("check constraint") ||
    (!updateError && !updatedRows?.length)
  ) {
    const fallback = await supabase
      .from("contracts")
      .update({
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractRecord.id)
      .eq("user_id", userId)
      .select("id, status");

    updateError = fallback.error;
    updatedRows = fallback.data;
    console.log("[upload] update result (completed fallback)", {
      updateError,
      updatedRows,
    });
  }

  if (updateError) {
    throw new Error(`update_contract: ${updateError.message}`);
  }

  if (!updatedRows?.length) {
    throw new Error(
      "update_contract: no rows updated (check contract id and RLS policies)."
    );
  }

  console.log("[upload] step=update_contract_status done", {
    contractId: contractRecord.id,
    status: updatedRows[0]?.status,
  });

  return { contractData };
}

function buildCompletedContract(
  contractId: string,
  userId: string,
  fields: {
    file_name: string;
    file_url: string;
    storage_path: string;
    uploaded_at?: string;
  }
): Contract {
  const now = new Date().toISOString();
  return {
    id: contractId,
    user_id: userId,
    file_name: fields.file_name,
    file_url: fields.file_url,
    storage_path: fields.storage_path,
    is_active: true,
    status: "complete",
    uploaded_at: fields.uploaded_at ?? now,
    created_at: fields.uploaded_at ?? now,
    updated_at: now,
  };
}

export async function POST(request: Request) {
  console.log("[upload] POST /api/upload start");

  const auth = await requireUser();
  if (!auth.user) {
    console.log("[upload] unauthorized");
    return auth.response;
  }

  const { supabase, user } = auth;

  const roleCheck = await requireOrgRole(supabase, user, requireCanUpload);
  if (!roleCheck.ok) return roleCheck.response;

  const organisationId = await getOrganisationId(supabase, user.id);
  let contractId: string | null = null;

  try {
    console.log("[upload] step=parse_form");
    const formData = await request.formData();
    const file = formData.get("file");
    const reprocessId = formData.get("contract_id");

    // Reprocess existing contract (retry) without re-uploading file
    if (
      typeof reprocessId === "string" &&
      reprocessId &&
      (!(file instanceof File) || file.size === 0)
    ) {
      contractId = reprocessId;
      console.log("[upload] step=reprocess", { contractId });

      const { data: existing, error: loadError } = await supabase
        .from("contracts")
        .select(
          "id, user_id, storage_path, file_url, file_name, uploaded_at, status"
        )
        .eq("id", contractId)
        .single();

      const canAccess = await userCanAccessContract(
        supabase,
        user.id,
        contractId,
        { requireEdit: true }
      );
      if (!canAccess) {
        return jsonError("reprocess", "Contract not found.", 404);
      }

      if (loadError || !existing) {
        return jsonError("load_contract", "Contract not found.", 404);
      }

      const storagePath = getContractStoragePath(existing);
      if (!storagePath) {
        return jsonError("storage_path", "Missing storage path.", 400);
      }

      await supabase
        .from("contracts")
        .update({ status: "processing" })
        .eq("id", contractId);

      const pdfBuffer = await downloadPdfBuffer(supabase, storagePath);
      const result = await runExtractionPipeline(
        supabase,
        contractId,
        user.id,
        pdfBuffer
      );

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/docs");
      revalidatePath("/dashboard/vendors");

      const completedContract = buildCompletedContract(contractId, user.id, {
        file_name: existing.file_name ?? "contract.pdf",
        file_url: existing.file_url ?? "",
        storage_path: storagePath,
        uploaded_at: existing.uploaded_at,
      });

      console.log("[upload] reprocess success", {
        contractId,
        status: "complete",
      });

      return NextResponse.json({
        success: true,
        status: "complete",
        contractId,
        contract: completedContract,
        contract_data: result.contractData,
      });
    }

    if (!(file instanceof File) || file.size === 0) {
      return jsonError("validate_file", "Please provide a PDF file.", 400);
    }

    if (file.type !== "application/pdf") {
      return jsonError("validate_file", "Only PDF files are supported.", 400);
    }

    contractId = crypto.randomUUID();
    const fileName = file.name.trim() || "contract.pdf";
    const safeName = sanitizeFileName(fileName);
    let storagePath = `${user.id}/${safeName}`;

    console.log("[upload] step=read_buffer");
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    console.log("[upload] buffer ready", { bytes: pdfBuffer.length });

    console.log("[upload] step=storage_upload", { storagePath });
    let { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      storagePath = `${user.id}/${contractId}-${safeName}`;
      const retry = await supabase.storage.from(BUCKET).upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });
      uploadError = retry.error;
      console.log("[upload] storage retry", {
        storagePath,
        error: uploadError?.message,
      });
    }

    if (uploadError) {
      return jsonError("storage_upload", uploadError.message, 500);
    }

    console.log("[upload] step=resolve_file_url");
    const { fileUrl, method } = await resolveContractFileUrl(
      supabase,
      storagePath
    );
    console.log("[upload] file_url", { fileUrl, method });

    if (!fileUrl) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return jsonError("file_url", "Failed to generate file URL.", 500);
    }

    console.log("[upload] step=insert_contract", { contractId });
    const { error: dbError } = await supabase.from("contracts").insert({
      id: contractId,
      user_id: user.id,
      organisation_id: organisationId,
      file_name: fileName,
      file_url: fileUrl,
      storage_path: storagePath,
      is_active: true,
      status: "processing",
    });

    if (dbError) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return jsonError("insert_contract", dbError.message, 500);
    }

    console.log("[upload] step=extraction_pipeline");
    const result = await runExtractionPipeline(
      supabase,
      contractId,
      user.id,
      pdfBuffer
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/docs");
    revalidatePath("/dashboard/vendors");

    const completedContract = buildCompletedContract(contractId, user.id, {
      file_name: fileName,
      file_url: fileUrl,
      storage_path: storagePath,
    });

    console.log("[upload] success", {
      contractId,
      status: "complete",
    });

    return NextResponse.json({
      success: true,
      status: "complete",
      contractId,
      contract: completedContract,
      contract_data: result.contractData,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload pipeline failed.";
    console.error("[upload] unhandled error", { contractId, message, err });

    if (contractId) {
      await markFailed(supabase, contractId);
    }

    return jsonError("pipeline", message, 500);
  }
}
