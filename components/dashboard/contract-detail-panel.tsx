"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Pencil, X } from "lucide-react";
import { updateContractValue } from "@/app/dashboard/actions";
import {
  getCurrencySymbol,
  normalizeCurrencyCode,
  SUPPORTED_CURRENCIES,
  type SupportedCurrency,
} from "@/lib/currency/currencies";
import type { ContractData } from "@/lib/types/contracts";
import { formatDate } from "@/lib/format";
import { useCurrency } from "@/components/providers/currency-provider";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  editValueOnOpen = false,
  onSaved,
}: {
  contract: ContractData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editValueOnOpen?: boolean;
  onSaved?: (message: string) => void;
}) {
  const { formatContractValue } = useCurrency();
  const { updateContractRow } = useDashboardData();
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState("");
  const [currencyInput, setCurrencyInput] = useState<SupportedCurrency>("GBP");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!contract) {
      setEditingValue(false);
      return;
    }
    setValueInput(
      contract.contract_value != null && contract.contract_value !== 0
        ? String(contract.contract_value)
        : ""
    );
    setCurrencyInput(normalizeCurrencyCode(contract.currency));
    setSaveError(null);
    setEditingValue(editValueOnOpen);
  }, [contract?.id, editValueOnOpen, open]);

  function handleCancelEdit() {
    if (!contract) return;
    setValueInput(
      contract.contract_value != null && contract.contract_value !== 0
        ? String(contract.contract_value)
        : ""
    );
    setCurrencyInput(normalizeCurrencyCode(contract.currency));
    setSaveError(null);
    setEditingValue(false);
  }

  function handleSaveValue() {
    if (!contract) return;
    const parsed = Number(valueInput.replace(/,/g, "").trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
      setSaveError("Enter a valid contract value.");
      return;
    }

    setSaveError(null);
    startTransition(async () => {
      const result = await updateContractValue(
        contract.id,
        parsed,
        currencyInput
      );

      if (result.error) {
        setSaveError(result.error);
        return;
      }

      if (result.contractData) {
        updateContractRow(result.contractData);
      }

      setEditingValue(false);
      onSaved?.("Contract value saved.");
    });
  }

  const autoRenewLabel =
    contract?.auto_renews === true
      ? "Yes"
      : contract?.auto_renews === false
        ? "No"
        : "—";

  const valueDisplay = contract
    ? formatContractValue(contract.contract_value, contract.currency)
    : null;

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
            <DetailRow
              label="Contract type"
              value={contract.contract_type ?? "—"}
            />

            <div className="border-b border-zinc-100 py-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Value
              </dt>
              <dd className="mt-1.5">
                {editingValue ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex min-w-[140px] flex-1 items-center">
                        <span className="pointer-events-none absolute left-3 text-sm font-medium text-zinc-500">
                          {getCurrencySymbol(currencyInput)}
                        </span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={valueInput}
                          onChange={(e) => setValueInput(e.target.value)}
                          disabled={pending}
                          placeholder="0"
                          className="h-10 pl-8 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
                        />
                      </div>
                      <select
                        value={currencyInput}
                        onChange={(e) =>
                          setCurrencyInput(
                            normalizeCurrencyCode(e.target.value)
                          )
                        }
                        disabled={pending}
                        className="h-10 min-w-[100px] rounded-lg border border-input bg-white px-2 text-sm focus-visible:border-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/30"
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                    {saveError ? (
                      <p className="text-sm text-red-600" role="alert">
                        {saveError}
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveValue}
                        disabled={pending}
                        className="bg-[#F97316] text-white hover:bg-[#EA580C]"
                      >
                        {pending ? (
                          <Loader2 className="animate-spin" />
                        ) : null}
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={pending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">
                        {valueDisplay?.display}
                      </p>
                      {valueDisplay?.originalNote ? (
                        <p className="mt-1 text-xs font-normal text-zinc-500">
                          {valueDisplay.originalNote}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingValue(true)}
                      className="shrink-0 text-zinc-500 hover:bg-orange-50 hover:text-[#F97316]"
                      aria-label="Edit contract value"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                )}
              </dd>
            </div>

            <DetailRow
              label="Start date"
              value={formatDate(contract.start_date)}
            />
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
