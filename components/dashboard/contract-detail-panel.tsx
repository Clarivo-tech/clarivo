"use client";

import { X } from "lucide-react";
import type { ContractData } from "@/lib/types/contracts";
import { formatContractValue, formatDate } from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="border-b border-zinc-100 py-4 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium text-zinc-900">{value}</dd>
    </div>
  );
}

export function ContractDetailPanel({
  contract,
  open,
  onOpenChange,
}: {
  contract: ContractData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const autoRenewLabel =
    contract?.auto_renews === true
      ? "Yes"
      : contract?.auto_renews === false
        ? "No"
        : "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full border-l border-zinc-200 bg-white p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-orange-100 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#F97316]">
                Contract details
              </p>
              <SheetTitle className="mt-1 text-xl font-semibold text-zinc-900">
                {contract?.vendor_name ?? "Contract"}
              </SheetTitle>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:bg-orange-50 hover:text-[#F97316]"
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
        </SheetHeader>

        {contract && (
          <dl className="overflow-y-auto px-6 py-2">
            <DetailRow label="Contract type" value={contract.contract_type ?? "—"} />
            <DetailRow
              label="Value"
              value={formatContractValue(
                contract.contract_value,
                contract.currency
              )}
            />
            <DetailRow label="Start date" value={formatDate(contract.start_date)} />
            <DetailRow label="End date" value={formatDate(contract.end_date)} />
            <DetailRow
              label="Renewal date"
              value={formatDate(contract.renewal_date)}
            />
            <DetailRow
              label="Notice period"
              value={
                contract.notice_period_days != null
                  ? `${contract.notice_period_days} days`
                  : "—"
              }
            />
            <DetailRow label="Auto-renewal" value={autoRenewLabel} />
            <div className="py-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Summary
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-700">
                {contract.summary?.trim() || "No summary available."}
              </dd>
            </div>
          </dl>
        )}
      </SheetContent>
    </Sheet>
  );
}
