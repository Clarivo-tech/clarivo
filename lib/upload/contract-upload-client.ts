import type { UploadSuccessResponse } from "@/lib/types/upload";

const UPLOAD_TIMEOUT_MS = 125_000;

export async function uploadContractPdf(
  file: File
): Promise<UploadSuccessResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const payload = (await response.json()) as UploadSuccessResponse & {
      error?: string;
      step?: string;
    };

    if (!response.ok) {
      const step = payload.step ? ` (${payload.step})` : "";
      throw new Error((payload.error ?? "Upload failed.") + step);
    }

    return {
      success: true,
      status: "complete",
      contractId: payload.contractId,
      contract: payload.contract,
      contract_data: payload.contract_data,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Upload and analysis timed out. Check server logs.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchSamplePdfAsFile(
  publicPath: string,
  fileName: string
): Promise<File> {
  const response = await fetch(publicPath);
  if (!response.ok) {
    throw new Error(
      `Sample contract is not available yet (${fileName}). Add the PDF to public/sample-contracts/.`
    );
  }

  const blob = await response.blob();
  const type = blob.type === "application/pdf" ? blob.type : "application/pdf";
  return new File([blob], fileName, { type });
}
