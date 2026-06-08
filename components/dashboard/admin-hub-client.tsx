"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, Search } from "lucide-react";
import type {
  AdminSubscriptionRow,
  AdminTrialRow,
  AdminUserRow,
} from "@/lib/admin/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/format";

function formatMoney(pence: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
  }).format(pence / 100);
}

function AdminTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-medium uppercase tracking-wide text-zinc-500">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">{children}</tbody>
      </table>
    </div>
  );
}

export function AdminHubClient({
  subscriptions,
  trials,
  users,
}: {
  subscriptions: AdminSubscriptionRow[];
  trials: AdminTrialRow[];
  users: AdminUserRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = [
        u.email,
        u.company,
        u.organisationName,
        u.plan,
        u.subscriptionStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, users]);

  function viewAsUser(userId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/impersonate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(payload.error ?? "Could not start impersonation.");
          return;
        }
        router.push("/dashboard");
        router.refresh();
      } catch {
        setError("Could not start impersonation.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-lg font-semibold">
            Live subscriptions ({subscriptions.length})
          </CardTitle>
          <CardDescription>
            Active Stripe billing subscriptions across all organisations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-zinc-500">No active subscriptions.</p>
          ) : (
            <AdminTable
              headers={[
                "Organisation",
                "Owner",
                "Licenses",
                "Monthly",
                "Stripe",
                "Since",
                "",
              ]}
            >
              {subscriptions.map((row) => (
                <tr key={row.id} className="text-zinc-800">
                  <td className="px-4 py-3 font-medium">{row.organisationName}</td>
                  <td className="px-4 py-3">{row.ownerEmail ?? row.ownerUserId}</td>
                  <td className="px-4 py-3">{row.licenses}</td>
                  <td className="px-4 py-3">
                    {formatMoney(row.amountPence, row.currency)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {row.stripeSubscriptionId?.slice(0, 8) ?? "—"}…
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {row.activatedAt ? formatDate(row.activatedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => viewAsUser(row.ownerUserId)}
                    >
                      View as
                    </Button>
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-lg font-semibold">
            Active free trials ({trials.length})
          </CardTitle>
          <CardDescription>
            Users currently in trial with time remaining.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trials.length === 0 ? (
            <p className="text-sm text-zinc-500">No active trials.</p>
          ) : (
            <AdminTable
              headers={[
                "Email",
                "Company",
                "Organisation",
                "Expires",
                "",
              ]}
            >
              {trials.map((row) => (
                <tr key={row.userId} className="text-zinc-800">
                  <td className="px-4 py-3">{row.email ?? "—"}</td>
                  <td className="px-4 py-3">{row.company ?? "—"}</td>
                  <td className="px-4 py-3">{row.organisationName ?? "—"}</td>
                  <td className="px-4 py-3">
                    {row.trialExpiresAt ? formatDate(row.trialExpiresAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => viewAsUser(row.userId)}
                    >
                      View as
                    </Button>
                  </td>
                </tr>
              ))}
            </AdminTable>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-lg font-semibold">
            All users ({users.length})
          </CardTitle>
          <CardDescription>
            Search any account and open their workspace as a super user.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email, company, org…"
              className="h-10 pl-9"
            />
          </div>

          <AdminTable
            headers={[
              "Email",
              "Company",
              "Organisation",
              "Plan",
              "Status",
              "",
            ]}
          >
            {filteredUsers.map((row) => (
              <tr key={row.userId} className="text-zinc-800">
                <td className="px-4 py-3">{row.email ?? "—"}</td>
                <td className="px-4 py-3">{row.company ?? "—"}</td>
                <td className="px-4 py-3">{row.organisationName ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{row.plan ?? "—"}</td>
                <td className="px-4 py-3 capitalize">
                  {row.subscriptionStatus ?? "—"}
                  {row.seatLimit != null ? ` · ${row.seatLimit} seats` : ""}
                </td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#F97316] text-white hover:bg-[#111827]"
                    disabled={pending}
                    onClick={() => viewAsUser(row.userId)}
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <LogIn className="size-4" />
                        View as
                      </>
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </AdminTable>
        </CardContent>
      </Card>
    </div>
  );
}
