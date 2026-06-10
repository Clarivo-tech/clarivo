"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import type { UploadSuccessResponse } from "@/lib/types/upload";
import { uploadContractPdf } from "@/lib/upload/contract-upload-client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function DocsUpload({
  onUploadComplete,
  disabled = false,
}: {
  onUploadComplete: (result: UploadSuccessResponse) => void | Promise<void>;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const result = await uploadContractPdf(file);
      await onUploadComplete(result);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading || disabled}
      />
      <Button
        type="button"
        disabled={uploading || disabled}
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
      {error && (
        <Alert variant="destructive" className="w-full sm:max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
