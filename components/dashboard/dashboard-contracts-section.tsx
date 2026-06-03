"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileStack, Upload } from "lucide-react";
import { isMissingContractValue } from "@/lib/currency/currencies";
import type { ContractData } from "@/lib/types/contracts";
import { formatDate } from "@/lib/format";
import { useCurrency } from "@/components/providers/currency-provider";
import { useDashboardData } from "@/components/dashboard/dashboard-data-provider";
import { ContractDetailPanel } from "@/components/dashboard/contract-detail-panel";
import { ContractStatusBadge } from "@/components/dashboard/contract-status-badge";
import { DashboardToast } from "@/components/dashboard/dashboard-toast";
import { EmptyState } from "@/components/dashboard/empty-state";
import { HealthScoreBadge } from "@/components/dashboard/health-score-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function DashboardContractsSection() {
  const { contractData, vendorIdByContractId, registerOpenContractPanel } =
    useDashboardData();
  const { formatContractValue } = useCurrency();
  const [selected, setSelected] = useState<ContractData | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editValueOnOpen, setEditValueOnOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    const updated = contractData.find((row) => row.id === selected.id);
    if (updated) setSelected(updated);
  }, [contractData, selected]);

  const openContract = useCallback(
    (row: ContractData, options?: { editValue?: boolean }) => {
      setSelected(row);
      setEditValueOnOpen(options?.editValue ?? false);
      setPanelOpen(true);
    },
    []
  );

  useEffect(() => {
    registerOpenContractPanel(openContract);
    return () => registerOpenContractPanel(null);
  }, [openContract, registerOpenContractPanel]);

  function handleAddValueClick(
    e: React.MouseEvent,
    row: ContractData
  ) {
    e.stopPropagation();
    openContract(row, { editValue: true });
  }

  return (
    <>
      {toast ? (
        <DashboardToast message={toast} onDismiss={() => setToast(null)} />
      ) : null}

      <section className="lg:col-span-2">
        <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-zinc-100 px-6 py-5">
            <h2 className="text-base font-semibold text-zinc-900">Contracts</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Click a row to view full contract details.
            </p>
          </div>
          <div className="p-2">
            {contractData.length === 0 ? (
              <EmptyState
                icon={FileStack}
                title="No contract data yet"
                description="Upload PDF contracts to see vendor details, values, and renewal dates here."
                action={
                  <Link href="/dashboard/docs">
                    <Button className="bg-[#F97316] text-white hover:bg-[#111827]">
                      <Upload />
                      Go to Contracts
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-100 hover:bg-transparent">
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Vendor
                      </TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Value
                      </TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Start
                      </TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        End
                      </TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Renewal
                      </TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Health
                      </TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Status
                      </TableHead>
                      <TableHead className="h-10 min-w-[140px] text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Type
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contractData.map((row) => {
                      const missingValue = isMissingContractValue(
                        row.contract_value
                      );
                      const value = formatContractValue(
                        row.contract_value,
                        row.currency
                      );

                      return (
                        <TableRow
                          key={row.id}
                          onClick={() => openContract(row)}
                          className="cursor-pointer border-zinc-100 text-[13px] transition-colors hover:bg-orange-50/40"
                        >
                          <TableCell
                            className="py-3.5 font-medium text-zinc-900"
                            onClick={(e) => {
                              const vendorId =
                                vendorIdByContractId[row.contract_id];
                              if (vendorId) e.stopPropagation();
                            }}
                          >
                            {(() => {
                              const vendorId =
                                vendorIdByContractId[row.contract_id];
                              const name = row.vendor_name ?? "—";
                              if (vendorId && row.vendor_name) {
                                return (
                                  <Link
                                    href={`/dashboard/vendors/${vendorId}`}
                                    className="text-[#111827] hover:text-[#111827] hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {name}
                                  </Link>
                                );
                              }
                              return name;
                            })()}
                          </TableCell>
                          <TableCell
                            className="py-3.5 tabular-nums"
                            onClick={(e) => {
                              if (missingValue) {
                                handleAddValueClick(e, row);
                              }
                            }}
                          >
                            {missingValue ? (
                              <button
                                type="button"
                                onClick={(e) => handleAddValueClick(e, row)}
                                className="text-sm font-medium text-[#F97316] hover:text-[#111827] hover:underline"
                              >
                                Add value
                              </button>
                            ) : (
                              <>
                                <span className="text-zinc-700">
                                  {value.display}
                                </span>
                                {value.originalNote ? (
                                  <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                                    {value.originalNote}
                                  </span>
                                ) : null}
                              </>
                            )}
                          </TableCell>
                          <TableCell className="py-3.5 text-zinc-600">
                            {formatDate(row.start_date)}
                          </TableCell>
                          <TableCell className="py-3.5 text-zinc-600">
                            {formatDate(row.end_date)}
                          </TableCell>
                          <TableCell className="py-3.5 text-zinc-600">
                            {formatDate(row.renewal_date)}
                          </TableCell>
                          <TableCell
                            className="py-3.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <HealthScoreBadge row={row} />
                          </TableCell>
                          <TableCell className="py-3.5">
                            <ContractStatusBadge status={row.status} />
                          </TableCell>
                          <TableCell
                            className="max-w-[220px] py-3.5 text-zinc-600"
                            title={row.contract_type ?? undefined}
                          >
                            <span className="line-clamp-2">
                              {row.contract_type ?? "—"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </section>

      <ContractDetailPanel
        contract={selected}
        open={panelOpen}
        onOpenChange={setPanelOpen}
        editValueOnOpen={editValueOnOpen}
        onSaved={(message) => {
          setToast(message);
          window.setTimeout(() => setToast(null), 5000);
        }}
      />
    </>
  );
}
