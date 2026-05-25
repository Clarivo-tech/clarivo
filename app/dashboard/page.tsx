import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  DollarSign,
  FileStack,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  computeDashboardStats,
  getContractDataByContractIds,
  getContracts,
  getRenewalAlerts,
} from "@/lib/data/contracts";
import {
  formatContractValue,
  formatCurrency,
  formatDate,
} from "@/lib/format";
import { ContractChat } from "@/components/dashboard/contract-chat";
import { StatCard } from "@/components/dashboard/stat-card";
import { ContractStatusBadge } from "@/components/dashboard/contract-status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const contracts = await getContracts(supabase, user.id);
  const contractIds = contracts.map((c) => c.id);
  const contractData = await getContractDataByContractIds(
    supabase,
    contractIds
  );

  const stats = computeDashboardStats(contracts, contractData);
  const alerts = getRenewalAlerts(contractData);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Overview of your contracts, portfolio value, and upcoming renewals.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Contracts"
          value={String(stats.totalContracts)}
          icon={FileStack}
        />
        <StatCard
          title="Total Value"
          value={formatCurrency(stats.totalValue)}
          icon={DollarSign}
        />
        <StatCard
          title="Renewals This Year"
          value={String(stats.renewalsThisYear)}
          icon={CalendarClock}
        />
        <StatCard
          title="Contracts Expiring Soon"
          value={String(stats.expiringSoon)}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="border-b border-zinc-100 px-6 py-5">
              <h2 className="text-base font-semibold text-zinc-900">
                Contracts
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Extracted data from your uploaded documents.
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
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contractData.map((row) => (
                        <TableRow
                          key={row.id}
                          className="border-zinc-100 text-[13px] transition-colors hover:bg-zinc-50/80"
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

        <section className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <div className="border-b border-zinc-100 px-6 py-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[#F97316]" />
              <h2 className="text-base font-semibold text-zinc-900">
                Renewal alerts
              </h2>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Contracts renewing within the next 30 days.
            </p>
          </div>
          <div className="p-6">
            {alerts.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No upcoming renewals"
                description="You're all set — no contracts are due to renew in the next 30 days."
                className="py-8"
              />
            ) : (
              <ul className="flex flex-col gap-3">
                {alerts.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-4 transition-colors hover:border-orange-200/60 hover:bg-orange-50/30"
                  >
                    <p className="text-sm font-medium text-zinc-900">
                      {row.vendor_name ?? "Unknown vendor"}
                    </p>
                    <p className="mt-1 text-[13px] text-zinc-600">
                      Renews {formatDate(row.renewal_date)}
                    </p>
                    {row.contract_value != null && (
                      <p className="mt-1 text-[13px] font-semibold tabular-nums text-[#F97316]">
                        {formatContractValue(
                          row.contract_value,
                          row.currency
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <ContractChat />
    </div>
  );
}
