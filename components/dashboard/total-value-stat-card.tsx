"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, DollarSign } from "lucide-react";
import { getAnnualContractValue } from "@/lib/contracts/annual-contract-value";
import { dedupeContractDataByContractId } from "@/lib/contracts/dedupe-contract-data";
import {
  getHealthScoreForContract,
  healthScoreDotClass,
} from "@/lib/contracts/health-score-colors";
import {
  isMissingContractValue,
  normalizeCurrencyCode,
} from "@/lib/currency/currencies";
import type { ContractData } from "@/lib/types/contracts";
import { useCurrency } from "@/components/providers/currency-provider";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { cn } from "@/lib/utils";

export const VALUE_VIEW_MODES = ["total", "annual"] as const;
export type ValueViewMode = (typeof VALUE_VIEW_MODES)[number];

const VALUE_VIEW_MODE_STORAGE_KEY = "clarivo-value-view-mode";

const VALUE_VIEW_LABELS: Record<ValueViewMode, string> = {
  total: "Total Value",
  annual: "Annual Total",
};

type BreakdownRow = {
  id: string;
  contract: ContractData;
  vendorName: string;
  contractType: string;
  healthTier: keyof typeof healthScoreDotClass;
  hasValue: boolean;
  displayValue: string;
  originalNote?: string;
  convertedAmount: number;
  sourceCurrency: string;
};

type CurrencyGroup = {
  currency: string;
  rows: BreakdownRow[];
  subtotalConverted: number;
};

function buildBreakdown(
  contractData: ContractData[],
  viewMode: ValueViewMode,
  formatContractValue: ReturnType<typeof useCurrency>["formatContractValue"],
  formatInBase: ReturnType<typeof useCurrency>["formatInBase"],
  convert: ReturnType<typeof useCurrency>["convert"]
): {
  valuedRows: BreakdownRow[];
  noValueRows: BreakdownRow[];
  groups: CurrencyGroup[] | null;
  totalConverted: number;
  totalDisplay: string;
  canExpand: boolean;
} {
  const rows = dedupeContractDataByContractId(contractData);

  const allRows: BreakdownRow[] = rows.map((row) => {
    const hasValue = !isMissingContractValue(row.contract_value);
    const sourceCurrency = normalizeCurrencyCode(row.currency);
    const rawValue = Number(row.contract_value) || 0;
    const amountForView =
      hasValue && viewMode === "annual"
        ? getAnnualContractValue(rawValue, row)
        : rawValue;
    const formatted = hasValue
      ? formatContractValue(amountForView, row.currency)
      : { display: "—" };

    let originalNote: string | undefined;
    if (
      hasValue &&
      formatted.originalNote
    ) {
      originalNote = formatted.originalNote.replace(/^\(orig\. /, "").replace(/\)$/, "");
    }

    const convertedAmount = hasValue
      ? convert(amountForView, row.currency)
      : 0;

    return {
      id: row.id,
      contract: row,
      vendorName: row.vendor_name ?? "Unknown vendor",
      contractType: row.contract_type ?? "—",
      healthTier: getHealthScoreForContract(row).tier,
      hasValue,
      displayValue: formatted.display,
      originalNote,
      convertedAmount,
      sourceCurrency,
    };
  });

  const valuedRows = allRows
    .filter((r) => r.hasValue)
    .sort((a, b) => b.convertedAmount - a.convertedAmount);
  const noValueRows = allRows
    .filter((r) => !r.hasValue)
    .sort((a, b) => a.vendorName.localeCompare(b.vendorName));

  const currencies = new Set(
    valuedRows.map((r) => r.sourceCurrency)
  );
  const hasMultipleCurrencies = currencies.size > 1;

  let groups: CurrencyGroup[] | null = null;
  if (hasMultipleCurrencies) {
    groups = Array.from(currencies)
      .sort()
      .map((currency) => {
        const groupRows = valuedRows.filter(
          (r) => r.sourceCurrency === currency
        );
        const subtotalConverted = groupRows.reduce(
          (sum, r) => sum + r.convertedAmount,
          0
        );
        return { currency, rows: groupRows, subtotalConverted };
      });
  }

  const totalConverted = valuedRows.reduce(
    (sum, r) => sum + r.convertedAmount,
    0
  );

  return {
    valuedRows,
    noValueRows,
    groups,
    totalConverted,
    totalDisplay: formatInBase(totalConverted),
    canExpand: allRows.length > 0,
  };
}

function BreakdownItem({
  row,
  onAddValue,
}: {
  row: BreakdownRow;
  onAddValue: (contract: ContractData) => void;
}) {
  return (
    <li className="flex gap-3 px-4 py-3">
      <span
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          healthScoreDotClass[row.healthTier]
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {row.vendorName}
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">{row.contractType}</p>
          </div>
          <div className="shrink-0 text-right">
            {row.hasValue ? (
              <>
                <p className="text-sm font-semibold tabular-nums text-white">
                  {row.displayValue}
                </p>
                {row.originalNote ? (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    orig. {row.originalNote}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-zinc-500">
                No value set{" "}
                <button
                  type="button"
                  onClick={() => onAddValue(row.contract)}
                  className="font-medium text-[#F97316] hover:text-[#FB923C] hover:underline"
                >
                  Add value
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function isValueViewMode(value: string): value is ValueViewMode {
  return (VALUE_VIEW_MODES as readonly string[]).includes(value);
}

export function TotalValueStatCard() {
  const { contractData, openContractPanel } = useDashboardData();
  const { formatContractValue, formatInBase, convert, ratesUpdatedLabel } =
    useCurrency();
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ValueViewMode>("total");

  useEffect(() => {
    const stored = localStorage.getItem(VALUE_VIEW_MODE_STORAGE_KEY);
    if (stored && isValueViewMode(stored)) {
      setViewMode(stored);
    }
  }, []);

  const breakdown = useMemo(
    () =>
      buildBreakdown(
        contractData,
        viewMode,
        formatContractValue,
        formatInBase,
        convert
      ),
    [contractData, viewMode, formatContractValue, formatInBase, convert]
  );

  function toggleExpanded() {
    if (!breakdown.canExpand) return;
    setExpanded((open) => !open);
  }

  function handleAddValue(contract: ContractData) {
    openContractPanel(contract, { editValue: true });
  }

  return (
    <div className="flex flex-col">
      <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-zinc-500">
              {VALUE_VIEW_LABELS[viewMode]}
            </p>
            {viewMode === "annual" ? (
              <p className="mt-0.5 text-xs text-zinc-400">
                Estimated yearly spend from contract terms.
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <select
              aria-label="Value view"
              value={viewMode}
              onChange={(e) => {
                const next = e.target.value;
                if (!isValueViewMode(next)) return;
                setViewMode(next);
                localStorage.setItem(VALUE_VIEW_MODE_STORAGE_KEY, next);
              }}
              className="h-8 rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-700 outline-none focus-visible:border-[#34D399] focus-visible:ring-3 focus-visible:ring-[#34D399]/30"
            >
              <option value="total">Total value</option>
              <option value="annual">Annual total</option>
            </select>
            {breakdown.canExpand ? (
              <ChevronDown
                className={cn(
                  "size-4 text-zinc-400 transition-transform duration-200",
                  expanded && "rotate-180"
                )}
                aria-hidden
              />
            ) : null}
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#34D399]/15">
              <DollarSign
                className="size-4"
                style={{ color: "#34D399" }}
                strokeWidth={2}
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleExpanded}
          disabled={!breakdown.canExpand}
          aria-expanded={expanded}
          aria-controls="total-value-breakdown"
          className={cn(
            "mt-3 text-left text-3xl font-bold tracking-tight text-zinc-900 tabular-nums",
            breakdown.canExpand &&
              "cursor-pointer rounded-md transition-colors hover:text-[#34D399] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34D399]/40"
          )}
        >
          {breakdown.totalDisplay}
        </button>
        <p className="mt-1.5 text-xs text-zinc-500">{ratesUpdatedLabel}</p>
      </div>

      {expanded && breakdown.canExpand ? (
        <div
          id="total-value-breakdown"
          className="mt-2 overflow-hidden rounded-xl border border-zinc-700 bg-[#111827] shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
        >
          <ul className="divide-y divide-zinc-700/80">
            {breakdown.groups
              ? breakdown.groups.map((group) => (
                  <li key={group.currency}>
                    <div className="bg-zinc-800/60 px-4 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {group.currency} contracts
                      </p>
                    </div>
                    <ul className="divide-y divide-zinc-700/80">
                      {group.rows.map((row) => (
                        <BreakdownItem
                          key={row.id}
                          row={row}
                          onAddValue={handleAddValue}
                        />
                      ))}
                    </ul>
                    <div className="flex justify-between border-t border-zinc-700/80 bg-zinc-800/40 px-4 py-2.5">
                      <span className="text-xs font-medium text-zinc-400">
                        {group.currency} subtotal
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-white">
                        {formatInBase(group.subtotalConverted)}
                      </span>
                    </div>
                  </li>
                ))
              : breakdown.valuedRows.map((row) => (
                  <BreakdownItem
                    key={row.id}
                    row={row}
                    onAddValue={handleAddValue}
                  />
                ))}

            {breakdown.noValueRows.map((row) => (
              <BreakdownItem
                key={row.id}
                row={row}
                onAddValue={handleAddValue}
              />
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-zinc-600 bg-zinc-800/80 px-4 py-3.5">
            <span className="text-sm font-semibold text-white">
              {viewMode === "annual" ? "Annual total" : "Total"}
            </span>
            <span className="text-base font-bold tabular-nums text-[#34D399]">
              {breakdown.totalDisplay}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
