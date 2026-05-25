import type { SupabaseClient } from "@supabase/supabase-js";
import { getContractStoragePath } from "@/lib/storage/contract-path";

const BUCKET = "contracts";
/** Bucket is private (public: false) — use authenticated download or signed URL. */
export const CONTRACTS_BUCKET_IS_PUBLIC = false;

export async function downloadContractPdf(
  supabase: SupabaseClient,
  contract: {
    storage_path?: string | null;
    file_url?: string | null;
  }
): Promise<{ buffer: Buffer; storagePath: string }> {
  const storagePath =
    contract.storage_path?.trim() || getContractStoragePath(contract);

  if (!storagePath) {
    throw new Error(
      "storage_path is missing on contract record and could not be derived from file_url."
    );
  }

  console.log("[extract] download start", {
    storagePath,
    bucket: BUCKET,
    bucketAccess: CONTRACTS_BUCKET_IS_PUBLIC ? "public" : "private",
    method: "storage.download (authenticated)",
  });

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(storagePath);

  if (!downloadError && blob) {
    const buffer = Buffer.from(await blob.arrayBuffer());
    console.log("[extract] download ok via storage.download", {
      storagePath,
      bytes: buffer.length,
    });
    if (buffer.length === 0) {
      throw new Error("Downloaded PDF is empty.");
    }
    return { buffer, storagePath };
  }

  console.warn("[extract] storage.download failed", {
    storagePath,
    error: downloadError?.message,
  });

  console.log("[extract] retry via createSignedUrl (private bucket fallback)");

  const { data: signed, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 300);

  if (signError || !signed?.signedUrl) {
    throw new Error(
      signError?.message ??
        downloadError?.message ??
        "Failed to download PDF from private storage."
    );
  }

  const response = await fetch(signed.signedUrl);
  if (!response.ok) {
    throw new Error(
      `Signed URL fetch failed: ${response.status} ${response.statusText}`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log("[extract] download ok via signed URL", {
    storagePath,
    bytes: buffer.length,
  });

  if (buffer.length === 0) {
    throw new Error("Downloaded PDF is empty.");
  }

  return { buffer, storagePath };
}
