import { getDashboardSession } from "@/lib/auth/dashboard-session";
import { AlertsPageClient } from "@/components/dashboard/alerts-page-client";
import { getContractDataByContractIds, getContracts } from "@/lib/data/contracts";
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
  const { dataSupabase, effectiveUserId } = await getDashboardSession();

  const [contracts, preferences] = await Promise.all([
    getContracts(dataSupabase, effectiveUserId),
    getUserPreferences(dataSupabase, effectiveUserId),
  ]);

  const contractData = await getContractDataByContractIds(
    dataSupabase,
    contracts.map((contract) => contract.id)
  );

  const { data: reminders } = await dataSupabase
    .from("reminders")
    .select("id, contract_id, title, reminder_date, notes, dismissed")
    .eq("user_id", effectiveUserId)
    .eq("dismissed", false)
    .order("reminder_date", { ascending: true });

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
        reminders={(reminders ?? []) as ReminderRow[]}
        initialPrefs={{
          remind_90_days: preferences.remind_90_days ?? true,
          remind_60_days: preferences.remind_60_days ?? true,
          remind_30_days: preferences.remind_30_days ?? true,
          remind_14_days: preferences.remind_14_days ?? false,
          remind_7_days: preferences.remind_7_days ?? false,
          remind_renewal: preferences.remind_renewal ?? true,
          remind_notice_deadline: preferences.remind_notice_deadline ?? true,
          remind_expiry: preferences.remind_expiry ?? true,
        }}
      />
    </div>
  );
}
