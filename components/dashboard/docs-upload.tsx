"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import type { UploadSuccessResponse } from "@/lib/types/upload";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DocsUpload({
  onUploadComplete,
}: {
  onUploadComplete: (result: UploadSuccessResponse) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 125_000);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const payload = (await response.json()) as UploadSuccessResponse & {
        error?: string;
        step?: string;
      };

      if (!response.ok) {
        const step = payload.step ? ` (${payload.step})` : "";
        throw new Error((payload.error ?? "Upload failed.") + step);
      }

      await onUploadComplete({
        success: true,
        status: "complete",
        contractId: payload.contractId,
        contract: payload.contract,
        contract_data: payload.contract_data,
      });

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      const message =
        err instanceof Error && err.name === "AbortError"
          ? "Upload and analysis timed out. Check server logs."
          : err instanceof Error
            ? err.message
            : "Upload failed.";
      setError(message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />
      <Button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="bg-[#F97316] text-white hover:bg-[#111827]"
      >
        {uploading ? (
          <>
            <Loader2 className="animate-spin" />
            Uploading & analyzing…
          </>
        ) : (
          <>
            <Upload />
            Upload contract
          </>
        )}
      </Button>
      <p className="text-sm text-zinc-500">PDF — upload and AI extraction in one step</p>
      {error && (
        <Alert variant="destructive" className="w-full sm:max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
