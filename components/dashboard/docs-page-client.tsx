"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchContractsForCurrentUser } from "@/lib/data/contracts-client";
import type { Contract } from "@/lib/types/contracts";
import type { UploadSuccessResponse } from "@/lib/types/upload";
import { DocsUpload } from "@/components/dashboard/docs-upload";
import { DocsGrid } from "@/components/dashboard/docs-grid";

function applyUploadSuccess(
  prev: Contract[],
  result: UploadSuccessResponse
): Contract[] {
  const completed: Contract = result.contract
    ? { ...result.contract, status: "complete" }
    : {
        id: result.contractId,
        user_id: "",
        file_name: "Contract",
        file_url: "",
        is_active: true,
        status: "complete",
        uploaded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  const index = prev.findIndex((c) => c.id === result.contractId);
  if (index === -1) {
    return [completed, ...prev];
  }

  const next = [...prev];
  next[index] = { ...next[index], ...completed, status: "complete" };
  return next;
}

export function DocsPageClient({
  initialContracts,
  canUpload = true,
}: {
  initialContracts: Contract[];
  canUpload?: boolean;
}) {
  const router = useRouter();
  const [contracts, setContracts] = useState(initialContracts);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const handleUploadComplete = useCallback(
    async (result: UploadSuccessResponse) => {
      setContracts((prev) => applyUploadSuccess(prev, result));
      router.refresh();
    },
    [router]
  );

  const removeContract = useCallback((contractId: string) => {
    setContracts((prev) => prev.filter((c) => c.id !== contractId));
  }, []);

  const handleRetry = useCallback(
    async (contractId: string) => {
      setBusyIds((prev) => new Set(prev).add(contractId));
      setContracts((prev) =>
        prev.map((c) =>
          c.id === contractId ? { ...c, status: "processing" } : c
        )
      );

      try {
        const formData = new FormData();
        formData.append("contract_id", contractId);

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
          throw new Error((payload.error ?? "Retry failed.") + step);
        }

        setContracts((prev) => applyUploadSuccess(prev, payload));
        router.refresh();
      } catch (err) {
        const message =
          err instanceof Error && err.name === "AbortError"
            ? "Processing timed out. Check server logs."
            : err instanceof Error
              ? err.message
              : "Retry failed.";
        alert(message);
        const list = await fetchContractsForCurrentUser();
        setContracts(list);
      } finally {
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(contractId);
          return next;
        });
      }
    },
    [router]
  );

  const handleDeleted = useCallback(async () => {
    const list = await fetchContractsForCurrentUser();
    setContracts(list);
    router.refresh();
  }, [router]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Documents
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Upload a PDF. Storage, AI extraction, and analysis complete in one step.
        </p>
        <div className="mt-4">
          {canUpload ? (
            <DocsUpload onUploadComplete={handleUploadComplete} />
          ) : (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              You do not have permission to upload contracts. Contact your
              workspace owner for access.
            </p>
          )}
        </div>
      </div>
      <DocsGrid
        contracts={contracts}
        canEdit={canUpload}
        busyIds={busyIds}
        onContractDeleted={removeContract}
        onDeleted={handleDeleted}
        onRetry={handleRetry}
      />
    </div>
  );
}
