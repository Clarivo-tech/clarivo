"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import type { UploadSuccessResponse } from "@/lib/types/upload";
import {
  TRIAL_SAMPLE_CONTRACTS,
  trialSampleContractPublicPath,
} from "@/lib/trial/sample-contracts";
import {
  fetchSamplePdfAsFile,
  uploadContractPdf,
} from "@/lib/upload/contract-upload-client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export function TrialSampleContracts({
  onUploadComplete,
  disabled = false,
}: {
  onUploadComplete: (result: UploadSuccessResponse) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUploadSample(sampleId: string) {
    const sample = TRIAL_SAMPLE_CONTRACTS.find((item) => item.id === sampleId);
    if (!sample || activeId) return;

    setError(null);
    setActiveId(sampleId);

    try {
      const file = await fetchSamplePdfAsFile(
        trialSampleContractPublicPath(sample.fileName),
        sample.fileName
      );
      const result = await uploadContractPdf(file);
      await onUploadComplete(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not upload sample contract."
      );
    } finally {
      setActiveId(null);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-orange-200/80 bg-orange-50/50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/15 text-[#111827]">
          <FileText className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-zinc-900">
            Try a sample contract
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Pick a PDF below to upload it into your trial workspace. You will
            see the same analyzing step as a real upload.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {TRIAL_SAMPLE_CONTRACTS.map((sample) => {
          const uploading = activeId === sample.id;
          const isBusy = Boolean(activeId);

          return (
            <div
              key={sample.id}
              className="flex flex-col rounded-lg border border-zinc-200/80 bg-white p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-zinc-900">
                {sample.label}
              </p>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-zinc-500">
                {sample.description}
              </p>
              <Button
                type="button"
                size="sm"
                disabled={disabled || isBusy}
                className={cn(
                  "mt-4 w-full bg-[#F97316] text-white hover:bg-[#111827]",
                  uploading && "opacity-100"
                )}
                onClick={() => handleUploadSample(sample.id)}
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Uploading &amp; analyzing…
                  </>
                ) : (
                  "Upload sample"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
