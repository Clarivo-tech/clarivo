import type { SupabaseClient } from "@supabase/supabase-js";
import { extractContractWithClaude } from "@/lib/extraction/call-claude";
import { deriveContractDataStatus } from "@/lib/extraction/contract-status";
import { parseExtractedJson } from "@/lib/extraction/parse";
import { downloadContractPdf } from "@/lib/storage/download-contract-pdf";

export async function runContractExtraction(
  supabase: SupabaseClient,
  contractId: string,
  userId: string
): Promise<{ error?: string }> {
  console.log("[extract] runContractExtraction start", { contractId, userId });

  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id, user_id, storage_path, file_url, file_name, status")
    .eq("id", contractId)
    .eq("user_id", userId)
    .single();

  if (contractError || !contract) {
    console.error("[extract] contract lookup failed", {
      contractId,
      error: contractError?.message,
    });
    return { error: "Contract not found." };
  }

  console.log("[extract] contract loaded", {
    contractId,
    file_name: contract.file_name,
    storage_path: contract.storage_path,
    has_file_url: Boolean(contract.file_url),
    status: contract.status,
  });

  if (contract.status === "completed") {
    console.log("[extract] already completed, skipping", { contractId });
    return {};
  }

  const { error: processingError } = await supabase
    .from("contracts")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", contractId)
    .eq("user_id", userId);

  if (processingError) {
    console.error("[extract] failed to set processing status", processingError);
  }

  try {
    const { buffer, storagePath } = await downloadContractPdf(
      supabase,
      contract
    );

    const pdfBase64 = buffer.toString("base64");
    console.log("[extract] PDF encoded to base64", {
      storagePath,
      base64Length: pdfBase64.length,
    });

    const text = await extractContractWithClaude(pdfBase64);
    const extracted = parseExtractedJson(text);

    console.log("[extract] parsed extraction", {
      vendor_name: extracted.vendor_name,
      contract_value: extracted.contract_value,
    });

    const dataStatus = deriveContractDataStatus(
      extracted.end_date,
      extracted.renewal_date
    );

    await supabase
      .from("contract_data")
      .delete()
      .eq("contract_id", contractId)
      .eq("user_id", userId);

    const { error: insertError } = await supabase.from("contract_data").insert({
      contract_id: contractId,
      user_id: userId,
      vendor_name: extracted.vendor_name,
      contract_value: extracted.contract_value,
      currency: extracted.currency,
      start_date: extracted.start_date,
      end_date: extracted.end_date,
      renewal_date: extracted.renewal_date,
      notice_period_days: extracted.notice_period_days,
      auto_renews: extracted.auto_renews,
      contract_type: extracted.contract_type,
      summary: extracted.summary,
      status: dataStatus,
    });

    if (insertError) {
      console.error("[extract] contract_data insert failed", insertError);
      await markFailed(supabase, contractId, userId);
      return { error: insertError.message };
    }

    const { error: updateError } = await supabase
      .from("contracts")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", contractId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[extract] contract status update failed", updateError);
      return { error: updateError.message };
    }

    console.log("[extract] runContractExtraction success", { contractId });
    return {};
  } catch (err) {
    await markFailed(supabase, contractId, userId);
    const message =
      err instanceof Error ? err.message : "AI extraction failed.";
    console.error("[extract] runContractExtraction failed", {
      contractId,
      message,
      err,
    });
    return { error: message };
  }
}

async function markFailed(
  supabase: SupabaseClient,
  contractId: string,
  userId: string
) {
  await supabase
    .from("contracts")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("id", contractId)
    .eq("user_id", userId);
}
