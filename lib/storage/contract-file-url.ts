import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days (Supabase max)

/**
 * Resolves a URL for a stored contract file.
 * Prefers a signed URL (works with private buckets); falls back to getPublicUrl.
 */
export async function resolveContractFileUrl(
  supabase: SupabaseClient,
  storagePath: string
): Promise<{ fileUrl: string; method: "signed" | "public" }> {
  const { data: signedData, error: signedError } = await supabase.storage
    .from("contracts")
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (signedData?.signedUrl) {
    return { fileUrl: signedData.signedUrl, method: "signed" };
  }

  if (signedError) {
    console.warn("[upload] createSignedUrl failed:", signedError.message);
  }

  const { data: publicData } = supabase.storage
    .from("contracts")
    .getPublicUrl(storagePath);

  return { fileUrl: publicData.publicUrl, method: "public" };
}
