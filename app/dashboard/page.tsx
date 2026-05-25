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
import { StatCard } from "@/components/dashboard/stat-card";
import { ContractStatusBadge } from "@/components/dashboard/contract-status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of your contracts, spend, and upcoming renewals.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Contracts"
          value={String(stats.totalContracts)}
          icon={FileStack}
        />
        <StatCard
          title="Total Spend"
          value={formatCurrency(stats.totalSpend)}
          icon={DollarSign}
        />
        <StatCard
          title="Renewals This Month"
          value={String(stats.renewalsThisMonth)}
          icon={CalendarClock}
        />
        <StatCard
          title="Contracts Expiring Soon"
          value={String(stats.expiringSoon)}
          icon={AlertTriangle}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-orange-100/80 lg:col-span-2">
          <CardHeader>
            <CardTitle>Contracts</CardTitle>
            <CardDescription>
              Extracted contract data from your uploaded documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {contractData.length === 0 ? (
              <EmptyState
                icon={FileStack}
                title="No contract data yet"
                description="Upload PDF contracts in My Docs. Once processed, vendor details and dates will appear here."
                action={
                  <Link href="/dashboard/docs">
                    <Button className="bg-[#F97316] text-white hover:bg-[#EA580C]">
                      <Upload />
                      Go to My Docs
                    </Button>
                  </Link>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Renewal</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.vendor_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {formatContractValue(
                          row.contract_value,
                          row.currency
                        )}
                      </TableCell>
                      <TableCell>{formatDate(row.start_date)}</TableCell>
                      <TableCell>{formatDate(row.end_date)}</TableCell>
                      <TableCell>{formatDate(row.renewal_date)}</TableCell>
                      <TableCell>{row.contract_type ?? "—"}</TableCell>
                      <TableCell>
                        <ContractStatusBadge status={row.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-100/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[#F97316]" />
              Renewal alerts
            </CardTitle>
            <CardDescription>
              Contracts renewing within the next 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                    className="rounded-lg border border-orange-100 bg-orange-50/50 p-3"
                  >
                    <p className="font-medium text-zinc-900">
                      {row.vendor_name ?? "Unknown vendor"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Renews {formatDate(row.renewal_date)}
                    </p>
                    {row.contract_value != null && (
                      <p className="mt-0.5 text-sm font-medium text-[#F97316]">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
