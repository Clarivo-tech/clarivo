"use client";

import { useMemo, useState, useTransition } from "react";
import { addDays, differenceInCalendarDays, format, parseISO, startOfToday, subDays } from "date-fns";
import { Bell, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  createCustomReminder,
  dismissCustomReminder,
  updateReminderPreferences,
} from "@/app/dashboard/actions";
import type { Contract, ContractData } from "@/lib/types/contracts";
import { cn } from "@/lib/utils";

type AlertType = "Renewal" | "Notice Deadline" | "Expiry";

type AlertRow = {
  id: string;
  vendor: string;
  type: AlertType;
  date: Date;
  daysUntil: number;
  status: "Upcoming" | "Overdue";
};

type ReminderRow = {
  id: string;
  contract_id: string;
  title: string;
  reminder_date: string;
  notes: string | null;
  dismissed: boolean | null;
};

type ReminderPrefs = {
  remind_90_days: boolean;
  remind_60_days: boolean;
  remind_30_days: boolean;
  remind_14_days: boolean;
  remind_7_days: boolean;
  remind_renewal: boolean;
  remind_notice_deadline: boolean;
  remind_expiry: boolean;
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

function buildAlerts(contractData: ContractData[]): AlertRow[] {
  const today = startOfToday();
  const maxHorizon = addDays(today, 365);
  const rows: AlertRow[] = [];

  for (const row of contractData) {
    const vendor = row.vendor_name?.trim() || "Unknown vendor";
    const renewal = parseDate(row.renewal_date);
    const expiry = parseDate(row.end_date);
    const notice =
      renewal && row.notice_period_days != null
        ? subDays(renewal, row.notice_period_days)
        : null;

    const pushAlert = (type: AlertType, date: Date | null) => {
      if (!date) return;
      const daysUntil = differenceInCalendarDays(date, today);
      if (date > maxHorizon) return;
      rows.push({
        id: `${row.contract_id}-${type}-${format(date, "yyyy-MM-dd")}`,
        vendor,
        type,
        date,
        daysUntil,
        status: daysUntil < 0 ? "Overdue" : "Upcoming",
      });
    };

    pushAlert("Renewal", renewal);
    pushAlert("Notice Deadline", notice);
    pushAlert("Expiry", expiry);
  }

  return rows.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function daysClass(daysUntil: number) {
  if (daysUntil < 30) return "text-red-600";
  if (daysUntil < 60) return "text-[#C2410C]";
  return "text-emerald-600";
}

export function AlertsPageClient({
  contractData,
  contracts,
  reminders,
  initialPrefs,
}: {
  contractData: ContractData[];
  contracts: Contract[];
  reminders: ReminderRow[];
  initialPrefs: ReminderPrefs;
}) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [prefs, setPrefs] = useState<ReminderPrefs>(initialPrefs);
  const [prefsPending, startPrefsTransition] = useTransition();

  const [contractId, setContractId] = useState(contracts[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [notes, setNotes] = useState("");
  const [formPending, startFormTransition] = useTransition();

  const [customRows, setCustomRows] = useState(reminders);
  const [dismissPendingId, setDismissPendingId] = useState<string | null>(null);

  const alerts = useMemo(() => buildAlerts(contractData), [contractData]);
  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  const contractNameById = useMemo(
    () =>
      new Map(
        contracts.map((c) => [c.id, c.file_name] as const)
      ),
    [contracts]
  );

  function updatePref<K extends keyof ReminderPrefs>(key: K, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function savePrefs() {
    startPrefsTransition(async () => {
      const result = await updateReminderPreferences(prefs);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  function submitReminder(e: React.FormEvent) {
    e.preventDefault();
    startFormTransition(async () => {
      const result = await createCustomReminder({
        contract_id: contractId,
        title,
        reminder_date: reminderDate,
        notes,
      });
      if (result.error) {
        alert(result.error);
        return;
      }
      setTitle("");
      setReminderDate("");
      setNotes("");
      location.reload();
    });
  }

  function dismissReminder(reminderId: string) {
    setDismissPendingId(reminderId);
    void (async () => {
      const result = await dismissCustomReminder(reminderId);
      if (result.error) {
        alert(result.error);
      } else {
        setCustomRows((prev) => prev.filter((row) => row.id !== reminderId));
      }
      setDismissPendingId(null);
    })();
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <section className="rounded-xl border border-zinc-800 bg-[#111827] shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
        <div className="border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-[#F97316]" />
            <h2 className="text-base font-semibold text-white">Active Alerts</h2>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Upcoming and overdue contract events across your portfolio.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-6 py-3">Contract</th>
                <th className="px-4 py-3">Alert type</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Days until</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {visibleAlerts.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-zinc-400" colSpan={6}>
                    No active alerts at the moment.
                  </td>
                </tr>
              ) : (
                visibleAlerts.map((alert) => (
                  <tr key={alert.id} className="text-zinc-100">
                    <td className="px-6 py-3.5">{alert.vendor}</td>
                    <td className="px-4 py-3.5">{alert.type}</td>
                    <td className="px-4 py-3.5">{format(alert.date, "MMM d, yyyy")}</td>
                    <td className={cn("px-4 py-3.5 font-semibold", daysClass(Math.abs(alert.daysUntil)))}>
                      {alert.daysUntil < 0 ? `${Math.abs(alert.daysUntil)} overdue` : alert.daysUntil}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        className={cn(
                          "border-0",
                          alert.status === "Overdue"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-[#C2410C]"
                        )}
                      >
                        {alert.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDismissedIds((prev) => new Set(prev).add(alert.id))
                        }
                        className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      >
                        Dismiss
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Card className="border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <CardHeader>
          <CardTitle>Reminder Preferences</CardTitle>
          <CardDescription>
            Choose event types and lead times for email reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["remind_renewal", "Renewal Date"],
              ["remind_notice_deadline", "Notice Period Deadline"],
              ["remind_expiry", "Contract Expiry"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3">
                <span className="text-sm font-medium text-zinc-700">{label}</span>
                <Switch
                  checked={Boolean(prefs[key as keyof ReminderPrefs])}
                  onCheckedChange={(checked) =>
                    updatePref(key as keyof ReminderPrefs, Boolean(checked))
                  }
                />
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            {[
              ["remind_90_days", "90 days"],
              ["remind_60_days", "60 days"],
              ["remind_30_days", "30 days"],
              ["remind_14_days", "14 days"],
              ["remind_7_days", "7 days"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5">
                <span className="text-sm text-zinc-700">{label}</span>
                <Switch
                  checked={Boolean(prefs[key as keyof ReminderPrefs])}
                  onCheckedChange={(checked) =>
                    updatePref(key as keyof ReminderPrefs, Boolean(checked))
                  }
                />
              </label>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={savePrefs}
              disabled={prefsPending}
              className="bg-[#F97316] text-white hover:bg-[#EA580C]"
            >
              {prefsPending ? <Loader2 className="animate-spin" /> : null}
              Save preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <CardHeader>
          <CardTitle>Custom Reminders</CardTitle>
          <CardDescription>
            Add manual reminders for one-off follow ups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitReminder} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">Contract</label>
                <select
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  required
                  className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                >
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.file_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">Reminder date</label>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  required
                  className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Reminder title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="E.g. confirm renewal negotiation with vendor"
                className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={formPending || contracts.length === 0}
                className="bg-[#F97316] text-white hover:bg-[#EA580C]"
              >
                {formPending ? <Loader2 className="animate-spin" /> : null}
                Save reminder
              </Button>
            </div>
          </form>

          <div className="mt-6 rounded-lg border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-2.5">Title</th>
                  <th className="px-4 py-2.5">Contract</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Notes</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {customRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-zinc-500">
                      No custom reminders yet.
                    </td>
                  </tr>
                ) : (
                  customRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{row.title}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {contractNameById.get(row.contract_id) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        {format(parseISO(row.reminder_date), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{row.notes ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={dismissPendingId === row.id}
                          onClick={() => dismissReminder(row.id)}
                          className="border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        >
                          {dismissPendingId === row.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Trash2 />
                          )}
                          Dismiss
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
