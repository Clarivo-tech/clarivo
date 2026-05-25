"use client";

import { useState } from "react";
import Link from "next/link";
import { FileStack, Upload } from "lucide-react";
import type { ContractData } from "@/lib/types/contracts";
import { formatContractValue, formatDate } from "@/lib/format";
import { ContractDetailPanel } from "@/components/dashboard/contract-detail-panel";
import { ContractStatusBadge } from "@/components/dashboard/contract-status-badge";
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

export function DashboardContractsSection({
  contractData,
}: {
  contractData: ContractData[];
}) {
  const [selected, setSelected] = useState<ContractData | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  function openContract(row: ContractData) {
    setSelected(row);
    setPanelOpen(true);
  }

  return (
    <>
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
                    <Button className="bg-[#F97316] text-white hover:bg-[#EA580C]">
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
                        Type
                      </TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Health
                      </TableHead>
                      <TableHead className="h-10 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Status
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contractData.map((row) => (
                      <TableRow
                        key={row.id}
                        onClick={() => openContract(row)}
                        className="cursor-pointer border-zinc-100 text-[13px] transition-colors hover:bg-orange-50/40"
                      >
                        <TableCell className="py-3.5 font-medium text-zinc-900">
                          {row.vendor_name ?? "—"}
                        </TableCell>
                        <TableCell className="py-3.5 tabular-nums text-zinc-700">
                          {formatContractValue(
                            row.contract_value,
                            row.currency
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
                        <TableCell className="py-3.5 text-zinc-600">
                          {row.contract_type ?? "—"}
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
                      </TableRow>
                    ))}
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
      />
    </>
  );
}
