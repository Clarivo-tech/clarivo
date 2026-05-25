"use client";

import { useTransition } from "react";
import { FileText, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { deleteContract } from "@/app/dashboard/actions";
import { FileStatusBadge } from "@/components/dashboard/file-status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDateTime } from "@/lib/format";
import { getContractUiState } from "@/lib/contracts/display-status";
import type { Contract } from "@/lib/types/contracts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function DocsGrid({
  contracts,
  busyIds,
  onContractDeleted,
  onDeleted,
  onRetry,
}: {
  contracts: Contract[];
  busyIds: Set<string>;
  onContractDeleted?: (contractId: string) => void;
  onDeleted?: () => void | Promise<void>;
  onRetry?: (contractId: string) => void;
}) {
  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload your first PDF contract to start tracking spend, renewals, and alerts."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contracts.map((contract) => (
        <DocCard
          key={contract.id}
          contract={contract}
          isBusy={busyIds.has(contract.id)}
          onContractDeleted={onContractDeleted}
          onDeleted={onDeleted}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}

function DocCard({
  contract,
  isBusy,
  onContractDeleted,
  onDeleted,
  onRetry,
}: {
  contract: Contract;
  isBusy: boolean;
  onContractDeleted?: (contractId: string) => void;
  onDeleted?: () => void | Promise<void>;
  onRetry?: (contractId: string) => void;
}) {
  const [deletePending, startDeleteTransition] = useTransition();
  const [retryPending, startRetryTransition] = useTransition();

  const ui = getContractUiState(contract);
  const isComplete =
    contract.status === "complete" || contract.status === "completed";
  const showSpinner = isBusy && !isComplete && ui.showExtractingSpinner;
  const cardDisabled = showSpinner || deletePending || retryPending;

  function handleDelete() {
    if (!confirm(`Delete "${contract.file_name}"? This cannot be undone.`)) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteContract(contract.id);
      if (result.error) {
        alert(result.error);
      } else {
        onContractDeleted?.(contract.id);
        await onDeleted?.();
      }
    });
  }

  function handleRetry() {
    startRetryTransition(() => {
      onRetry?.(contract.id);
    });
  }

  return (
    <Card
      className={cn(
        "flex flex-col rounded-xl border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        showSpinner && "ring-2 ring-[#F97316]/25"
      )}
    >
      <CardHeader className="pb-3">
        <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-[#F97316]/10">
          <FileText className="size-5 text-[#F97316]" />
        </div>
        <CardTitle className="line-clamp-2 text-base leading-snug">
          {contract.file_name}
        </CardTitle>
        <CardDescription>
          Uploaded {formatDateTime(contract.uploaded_at)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {showSpinner ? (
          <div className="flex items-center gap-2 text-sm text-sky-700">
            <Loader2 className="size-4 animate-spin text-[#F97316]" />
            <span>Extracting contract data with AI…</span>
          </div>
        ) : (
          <FileStatusBadge status={ui.displayStatus} />
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t border-zinc-100 pt-4">
        {ui.showRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
          disabled={cardDisabled}
          onClick={handleRetry}
            className="w-full border-orange-200 text-[#F97316] hover:bg-orange-50 hover:text-[#EA580C]"
          >
            {retryPending || isBusy ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            Retry extraction
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cardDisabled}
          onClick={handleDelete}
          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          {deletePending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Trash2 />
          )}
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
