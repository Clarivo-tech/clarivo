import Link from "next/link";
import { AdminHubClient } from "@/components/dashboard/admin-hub-client";
import {
  fetchAdminActiveTrials,
  fetchAdminSubscriptions,
  fetchAdminUsers,
} from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  const [subscriptions, trials, users] = await Promise.all([
    fetchAdminSubscriptions(),
    fetchAdminActiveTrials(),
    fetchAdminUsers(),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Platform admin
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Live subscriptions, active trials, and user impersonation. Only
            visible to the platform operator account.
          </p>
        </div>
        <Link
          href="/dashboard/admin/bookings"
          className="inline-flex h-10 items-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Demo bookings
        </Link>
      </div>

      <AdminHubClient
        subscriptions={subscriptions}
        trials={trials}
        users={users}
      />
    </div>
  );
}
