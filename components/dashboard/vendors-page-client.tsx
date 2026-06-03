"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Grid3X3,
  LayoutList,
  Plus,
  PoundSterling,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { deleteVendor } from "@/app/dashboard/vendors/actions";
import { VendorFormSheet } from "@/components/dashboard/vendor-form-sheet";
import { VendorRiskBadge } from "@/components/dashboard/vendor-risk-badge";
import { VendorStatusBadge } from "@/components/dashboard/vendor-status-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { vendorInitials } from "@/lib/vendors/constants";
import type { Vendor, VendorListRow, VendorStats } from "@/lib/types/vendors";
import { cn } from "@/lib/utils";

function formatSpend(value: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function VendorsPageClient({
  rows,
  stats,
  baseCurrency,
}: {
  rows: VendorListRow[];
  stats: VendorStats;
  baseCurrency: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<"grid" | "table">("grid");
  const [formOpen, setFormOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);

  function openCreate() {
    setEditVendor(null);
    setFormOpen(true);
  }

  function openEdit(vendor: Vendor) {
    setEditVendor(vendor);
    setFormOpen(true);
  }

  async function handleDelete(vendor: Vendor) {
    if (
      !window.confirm(
        `Delete "${vendor.name}"? Linked contracts will be unlinked.`
      )
    ) {
      return;
    }
    const result = await deleteVendor(vendor.id);
    if (result.error) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Vendors
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your supplier relationships in one place
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="shrink-0 bg-[#F97316] text-white hover:bg-[#111827]"
        >
          <Plus />
          Add Vendor
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Vendors"
          value={String(stats.totalVendors)}
          icon={Building2}
          iconColor="#F97316"
          iconBgClassName="bg-[#F97316]/15"
        />
        <StatCard
          title="Critical Vendors"
          value={String(stats.criticalVendors)}
          icon={Star}
          iconColor="#111827"
          iconBgClassName="bg-orange-100"
        />
        <StatCard
          title="High Risk Vendors"
          value={String(stats.highRiskVendors)}
          icon={AlertTriangle}
          iconColor="#DC2626"
          iconBgClassName="bg-red-100"
        />
        <StatCard
          title="Total Vendor Spend"
          value={formatSpend(stats.totalVendorSpend, baseCurrency)}
          icon={PoundSterling}
          iconColor="#38BDF8"
          iconBgClassName="bg-[#38BDF8]/15"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">
          {rows.length} vendor{rows.length === 1 ? "" : "s"}
        </p>
        <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "grid"
                ? "bg-[#F97316] text-white"
                : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            <Grid3X3 className="size-4" />
            Grid
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              view === "table"
                ? "bg-[#F97316] text-white"
                : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            <LayoutList className="size-4" />
            Table
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-8 py-16 text-center">
          <Users className="mx-auto size-10 text-zinc-300" />
          <p className="mt-4 text-base font-medium text-zinc-900">
            No vendors yet
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Add a vendor manually or upload a contract — we&apos;ll create
            vendors automatically from extracted names.
          </p>
          <Button
            onClick={openCreate}
            className="mt-6 bg-[#F97316] text-white hover:bg-[#111827]"
          >
            <Plus />
            Add your first vendor
          </Button>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/dashboard/vendors/${vendor.id}`}
              className="group rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-lg font-bold text-white">
                  {vendorInitials(vendor.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold text-zinc-900 group-hover:text-[#111827]">
                      {vendor.name}
                    </h2>
                    {vendor.is_critical ? (
                      <Star className="size-4 shrink-0 fill-[#F97316] text-[#F97316]" />
                    ) : null}
                  </div>
                  {vendor.industry ? (
                    <span className="mt-1 inline-block rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {vendor.industry}
                    </span>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <VendorRiskBadge rating={vendor.risk_rating} />
                    <VendorStatusBadge status={vendor.status} />
                  </div>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-4 text-sm">
                <div>
                  <dt className="text-xs text-zinc-500">Contracts</dt>
                  <dd className="font-semibold text-zinc-900">
                    {vendor.contractCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Total spend</dt>
                  <dd className="font-semibold tabular-nums text-zinc-900">
                    {formatSpend(vendor.totalSpend, baseCurrency)}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-100 hover:bg-transparent">
                <TableHead className="text-xs uppercase text-zinc-500">
                  Vendor
                </TableHead>
                <TableHead className="text-xs uppercase text-zinc-500">
                  Industry
                </TableHead>
                <TableHead className="text-xs uppercase text-zinc-500">
                  Risk
                </TableHead>
                <TableHead className="text-xs uppercase text-zinc-500">
                  Contracts
                </TableHead>
                <TableHead className="text-xs uppercase text-zinc-500">
                  Spend
                </TableHead>
                <TableHead className="text-xs uppercase text-zinc-500">
                  Account manager
                </TableHead>
                <TableHead className="text-xs uppercase text-zinc-500">
                  Status
                </TableHead>
                <TableHead className="text-right text-xs uppercase text-zinc-500">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((vendor) => (
                <TableRow key={vendor.id} className="border-zinc-100">
                  <TableCell className="font-medium text-zinc-900">
                    <Link
                      href={`/dashboard/vendors/${vendor.id}`}
                      className="hover:text-[#111827] hover:underline"
                    >
                      {vendor.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-600">
                    {vendor.industry ?? "—"}
                  </TableCell>
                  <TableCell>
                    <VendorRiskBadge rating={vendor.risk_rating} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {vendor.contractCount}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatSpend(vendor.totalSpend, baseCurrency)}
                  </TableCell>
                  <TableCell className="text-zinc-600">
                    {vendor.account_manager_name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <VendorStatusBadge status={vendor.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/dashboard/vendors/${vendor.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(vendor)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(vendor)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <VendorFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        vendor={editVendor}
        onSaved={(id) => {
          router.refresh();
          if (id && !editVendor) {
            router.push(`/dashboard/vendors/${id}`);
          }
        }}
      />
    </div>
  );
}
