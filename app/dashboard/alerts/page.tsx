import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { AlertsPageClient } from "@/components/dashboard/alerts-page-client";
import { getContractDataByContractIds, getContracts } from "@/lib/data/contracts";
import { listCustomReminders } from "@/lib/data/custom-reminders";
import { resolveReminderPreferences } from "@/lib/data/reminder-preferences";
import { getUserPreferences } from "@/lib/data/user-preferences";

export const dynamic = "force-dynamic";

type ReminderRow = {
  id: string;
  contract_id: string;
  title: string;
  reminder_date: string;
  notes: string | null;
  dismissed: boolean | null;
};

export default async function AlertsPage() {
  const { dataSupabase, effectiveUserId, user } = await getDashboardSession();

  const [contracts, preferences] = await Promise.all([
    getContracts(dataSupabase, effectiveUserId),
    getUserPreferences(dataSupabase, effectiveUserId),
  ]);

  const contractData = await getContractDataByContractIds(
    dataSupabase,
    contracts.map((contract) => contract.id)
  );

  const reminders = await listCustomReminders(
    dataSupabase,
    effectiveUserId,
    user.user_metadata
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Alerts &amp; Reminders
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Stay ahead of every contract deadline
        </p>
      </div>

      <AlertsPageClient
        contractData={contractData}
        contracts={contracts}
        reminders={reminders as ReminderRow[]}
        initialPrefs={resolveReminderPreferences(
          preferences,
          user?.user_metadata
        )}
      />
    </div>
  );
}
