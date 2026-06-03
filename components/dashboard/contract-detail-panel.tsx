"use client";

import { useEffect, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, Pencil, X } from "lucide-react";
import { updateContractDetails } from "@/app/dashboard/actions";
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

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return format(parseISO(value), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

function autoRenewsToSelectValue(
  value: boolean | null | undefined
): "" | "yes" | "no" {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

function selectValueToAutoRenews(value: string): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

type ContractFormState = {
  vendorName: string;
  contractType: string;
  valueInput: string;
  currencyInput: SupportedCurrency;
  startDate: string;
  endDate: string;
  renewalDate: string;
  noticePeriodDays: string;
  autoRenews: "" | "yes" | "no";
  summary: string;
};

function formFromContract(contract: ContractData): ContractFormState {
  return {
    vendorName: contract.vendor_name?.trim() ?? "",
    contractType: contract.contract_type?.trim() ?? "",
    valueInput:
      contract.contract_value != null && contract.contract_value !== 0
        ? String(contract.contract_value)
        : "",
    currencyInput: normalizeCurrencyCode(contract.currency),
    startDate: toDateInputValue(contract.start_date),
    endDate: toDateInputValue(contract.end_date),
    renewalDate: toDateInputValue(contract.renewal_date),
    noticePeriodDays:
      contract.notice_period_days != null
        ? String(contract.notice_period_days)
        : "",
    autoRenews: autoRenewsToSelectValue(contract.auto_renews),
    summary: contract.summary?.trim() ?? "",
  };
}

function DetailRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: React.ReactNode;
  onEdit?: () => void;
}) {
  return (
    <div className="border-b border-zinc-100 py-4 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 text-sm font-medium text-zinc-900">
          {value}
        </div>
        {onEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            className="shrink-0 text-zinc-500 hover:bg-orange-50 hover:text-[#F97316]"
            aria-label={`Edit ${label}`}
          >
            <Pencil className="size-4" />
          </Button>
        ) : null}
      </dd>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-zinc-100 py-4 last:border-0">
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

const inputClassName =
  "h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30";

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
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ContractFormState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!contract) {
      setIsEditing(false);
      setForm(null);
      return;
    }
    setForm(formFromContract(contract));
    setSaveError(null);
    setIsEditing(editValueOnOpen);
  }, [contract?.id, editValueOnOpen, open]);

  function patchForm(patch: Partial<ContractFormState>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function handleCancelEdit() {
    if (!contract) return;
    setForm(formFromContract(contract));
    setSaveError(null);
    setIsEditing(false);
  }

  function handleSave() {
    if (!contract || !form) return;

    const trimmedValue = form.valueInput.replace(/,/g, "").trim();
    let contractValue: number | null = null;
    if (trimmedValue) {
      const parsed = Number(trimmedValue);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setSaveError("Enter a valid contract value.");
        return;
      }
      contractValue = parsed;
    }

    let noticePeriodDays: number | null = null;
    if (form.noticePeriodDays.trim()) {
      const parsed = Number(form.noticePeriodDays.trim());
      if (!Number.isInteger(parsed) || parsed < 0) {
        setSaveError("Notice period must be a whole number of days.");
        return;
      }
      noticePeriodDays = parsed;
    }

    setSaveError(null);
    startTransition(async () => {
      const result = await updateContractDetails(contract.id, {
        vendorName: form.vendorName,
        contractType: form.contractType,
        contractValue,
        currency: form.currencyInput,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        renewalDate: form.renewalDate || null,
        noticePeriodDays,
        autoRenews: selectValueToAutoRenews(form.autoRenews),
        summary: form.summary,
      });

      if (result.error) {
        setSaveError(result.error);
        return;
      }

      if (result.contractData) {
        updateContractRow(result.contractData);
      }

      setIsEditing(false);
      onSaved?.("Contract details saved.");
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

  const displayVendor = contract?.vendor_name?.trim() || "Contract";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full border-l border-zinc-200 bg-white p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-orange-100 bg-white px-6 py-5">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-[#F97316]">
                Contract details
              </p>
              {isEditing && form ? (
                <Input
                  value={form.vendorName}
                  onChange={(e) => patchForm({ vendorName: e.target.value })}
                  disabled={pending}
                  placeholder="Vendor name"
                  className="mt-2 font-sans text-lg font-semibold"
                />
              ) : (
                <SheetTitle className="mt-1 font-sans text-xl font-semibold text-zinc-900">
                  {displayVendor}
                </SheetTitle>
              )}
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

        {contract && form && (
          <>
            {!isEditing && (
              <div className="flex justify-end border-b border-zinc-100 px-6 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1.5"
                >
                  <Pencil className="size-3.5" />
                  Edit contract
                </Button>
              </div>
            )}

            {isEditing ? (
              <div className="overflow-y-auto px-6 py-2">
                <FormField label="Contract type">
                  <Input
                    value={form.contractType}
                    onChange={(e) =>
                      patchForm({ contractType: e.target.value })
                    }
                    disabled={pending}
                    placeholder="e.g. SaaS"
                    className={inputClassName}
                  />
                </FormField>

                <FormField label="Value">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex min-w-[140px] flex-1 items-center">
                      <span className="pointer-events-none absolute left-3 text-sm font-medium text-zinc-500">
                        {getCurrencySymbol(form.currencyInput)}
                      </span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={form.valueInput}
                        onChange={(e) =>
                          patchForm({ valueInput: e.target.value })
                        }
                        disabled={pending}
                        placeholder="0"
                        className={`${inputClassName} pl-8`}
                      />
                    </div>
                    <select
                      value={form.currencyInput}
                      onChange={(e) =>
                        patchForm({
                          currencyInput: normalizeCurrencyCode(e.target.value),
                        })
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
                </FormField>

                <FormField label="Start date">
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => patchForm({ startDate: e.target.value })}
                    disabled={pending}
                    className={inputClassName}
                  />
                </FormField>

                <FormField label="End date">
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => patchForm({ endDate: e.target.value })}
                    disabled={pending}
                    className={inputClassName}
                  />
                </FormField>

                <FormField label="Renewal date">
                  <Input
                    type="date"
                    value={form.renewalDate}
                    onChange={(e) =>
                      patchForm({ renewalDate: e.target.value })
                    }
                    disabled={pending}
                    className={inputClassName}
                  />
                </FormField>

                <FormField label="Notice period (days)">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={form.noticePeriodDays}
                    onChange={(e) =>
                      patchForm({ noticePeriodDays: e.target.value })
                    }
                    disabled={pending}
                    placeholder="e.g. 90"
                    className={inputClassName}
                  />
                </FormField>

                <FormField label="Auto-renewal">
                  <select
                    value={form.autoRenews}
                    onChange={(e) =>
                      patchForm({
                        autoRenews: e.target.value as "" | "yes" | "no",
                      })
                    }
                    disabled={pending}
                    className="h-10 w-full rounded-lg border border-input bg-white px-2 text-sm focus-visible:border-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/30"
                  >
                    <option value="">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </FormField>

                <FormField label="Summary">
                  <textarea
                    value={form.summary}
                    onChange={(e) => patchForm({ summary: e.target.value })}
                    disabled={pending}
                    rows={4}
                    placeholder="Contract summary"
                    className="w-full resize-y rounded-lg border border-input bg-white px-3 py-2 text-sm focus-visible:border-[#F97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/30"
                  />
                </FormField>

                {saveError ? (
                  <p className="py-2 text-sm text-red-600" role="alert">
                    {saveError}
                  </p>
                ) : null}

                <div className="sticky bottom-0 flex gap-2 border-t border-zinc-100 bg-white py-4">
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={pending}
                    className="flex-1 bg-[#F97316] text-white hover:bg-[#111827]"
                  >
                    {pending ? (
                      <Loader2 className="animate-spin" />
                    ) : null}
                    Save changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="overflow-y-auto px-6 py-2">
                <DetailRow
                  label="Contract type"
                  value={contract.contract_type ?? "—"}
                  onEdit={() => setIsEditing(true)}
                />

                <DetailRow
                  label="Value"
                  value={
                    <div>
                      <p>{valueDisplay?.display}</p>
                      {valueDisplay?.originalNote ? (
                        <p className="mt-1 text-xs font-normal text-zinc-500">
                          {valueDisplay.originalNote}
                        </p>
                      ) : null}
                    </div>
                  }
                  onEdit={() => setIsEditing(true)}
                />

                <DetailRow
                  label="Start date"
                  value={formatDate(contract.start_date)}
                  onEdit={() => setIsEditing(true)}
                />
                <DetailRow
                  label="End date"
                  value={formatDate(contract.end_date)}
                  onEdit={() => setIsEditing(true)}
                />
                <DetailRow
                  label="Renewal date"
                  value={formatDate(contract.renewal_date)}
                  onEdit={() => setIsEditing(true)}
                />
                <DetailRow
                  label="Notice period"
                  value={
                    contract.notice_period_days != null
                      ? `${contract.notice_period_days} days`
                      : "—"
                  }
                  onEdit={() => setIsEditing(true)}
                />
                <DetailRow
                  label="Auto-renewal"
                  value={autoRenewLabel}
                  onEdit={() => setIsEditing(true)}
                />
                <div className="border-b border-zinc-100 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Summary
                    </dt>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIsEditing(true)}
                      className="shrink-0 text-zinc-500 hover:bg-orange-50 hover:text-[#F97316]"
                      aria-label="Edit summary"
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                  <dd className="mt-2 text-sm leading-relaxed text-zinc-700">
                    {contract.summary?.trim() || "No summary available."}
                  </dd>
                </div>
              </dl>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
