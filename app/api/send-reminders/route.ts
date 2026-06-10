import { differenceInCalendarDays, format, parseISO, startOfToday, subDays } from "date-fns";
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { sendEmail } from "@/lib/email/send";
import { sendCustomReminderEmail } from "@/lib/email/custom-reminder-email";
import {
  listDueCustomRemindersForUser,
  markCustomRemindersSent,
} from "@/lib/data/custom-reminders";
import { listReminderPreferenceRows } from "@/lib/data/reminder-preferences";
import { createAdminClient } from "@/lib/supabase/admin";

function reminderEmailHtml(input: {
  firstName: string;
  days: number;
  vendor: string;
  contractValue: number | null;
  renewalDate: string | null;
  noticePeriodDays: number | null;
  warningPassedNotice: boolean;
  dashboardUrl: string;
}) {
  const value =
    input.contractValue != null
      ? new Intl.NumberFormat("en-GB", {
          style: "currency",
          currency: "GBP",
          maximumFractionDigits: 0,
        }).format(input.contractValue)
      : "—";

  return `
  <div style="margin:0;padding:24px;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#111;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:14px;overflow:hidden;">
      <div style="background:#F97316;padding:20px 24px;color:#fff;">
        <h1 style="margin:0;font-size:20px;line-height:1.3;">⏰ Contract reminder</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 12px 0;">Hi <strong>${input.firstName}</strong>, this is your <strong>${input.days}-day reminder</strong>.</p>
        <div style="border:1px solid #eee;border-radius:10px;padding:14px;margin-bottom:14px;">
          <p style="margin:0 0 6px 0;"><strong>Vendor:</strong> ${input.vendor}</p>
          <p style="margin:0 0 6px 0;"><strong>Value:</strong> ${value}</p>
          <p style="margin:0 0 6px 0;"><strong>Renewal date:</strong> ${input.renewalDate ? format(parseISO(input.renewalDate), "MMM d, yyyy") : "—"}</p>
          <p style="margin:0;"><strong>Notice period:</strong> ${input.noticePeriodDays ?? "—"} days</p>
        </div>
        ${
          input.warningPassedNotice
            ? `<p style="margin:0 0 12px 0;color:#B91C1C;font-weight:600;">Warning: notice period has already passed.</p>`
            : ""
        }
        <a href="${input.dashboardUrl}" style="display:inline-block;background:#F97316;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
          View contract in Clarivo
        </a>
      </div>
    </div>
  </div>`;
}

async function runSendReminders(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = startOfToday();
  const dashboardUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") + "/dashboard" ||
    "http://localhost:3000/dashboard";

  const { rows: prefs, error: prefsError } =
    await listReminderPreferenceRows(admin);

  if (prefsError) {
    return NextResponse.json({ error: prefsError }, { status: 500 });
  }

  let sent = 0;

  const todayIso = format(today, "yyyy-MM-dd");

  for (const pref of prefs) {
    const { data: userResult } = await admin.auth.admin.getUserById(pref.user_id);
    const email = userResult.user?.email;
    if (!email) continue;

    const enabledDays = new Set<number>();
    if (pref.remind_90_days ?? true) enabledDays.add(90);
    if (pref.remind_60_days ?? true) enabledDays.add(60);
    if (pref.remind_30_days ?? true) enabledDays.add(30);
    if (pref.remind_14_days ?? false) enabledDays.add(14);
    if (pref.remind_7_days ?? false) enabledDays.add(7);

    if (enabledDays.size > 0) {
      const { data: contracts } = await admin
        .from("contracts")
        .select("id")
        .eq("user_id", pref.user_id)
        .eq("is_active", true);

      const contractIds = (contracts ?? []).map((c) => c.id);

      if (contractIds.length > 0) {
        const { data: rows } = await admin
          .from("contract_data")
          .select(
            "contract_id, vendor_name, contract_value, renewal_date, end_date, notice_period_days"
          )
          .in("contract_id", contractIds);

        for (const row of rows ?? []) {
          const events: Array<{ type: "renewal" | "notice" | "expiry"; date: string | null }> = [
            { type: "renewal", date: row.renewal_date },
            { type: "expiry", date: row.end_date },
          ];

          if (row.renewal_date && row.notice_period_days != null) {
            const deadline = subDays(parseISO(row.renewal_date), row.notice_period_days);
            events.push({ type: "notice", date: deadline.toISOString() });
          }

          for (const event of events) {
            if (!event.date) continue;
            const eventDate = parseISO(event.date);
            const days = differenceInCalendarDays(eventDate, today);
            if (!enabledDays.has(days)) continue;
            if (event.type === "renewal" && !(pref.remind_renewal ?? true)) continue;
            if (event.type === "notice" && !(pref.remind_notice_deadline ?? true)) continue;
            if (event.type === "expiry" && !(pref.remind_expiry ?? true)) continue;

            const noticeWarning =
              row.renewal_date && row.notice_period_days != null
                ? differenceInCalendarDays(
                    subDays(parseISO(row.renewal_date), row.notice_period_days),
                    today
                  ) < 0
                : false;

            await sendEmail({
              to: email,
              subject: `⏰ Contract reminder: ${row.vendor_name ?? "Vendor"} renews in ${days} days`,
              html: reminderEmailHtml({
                firstName: pref.first_name ?? "there",
                days,
                vendor: row.vendor_name ?? "Unknown vendor",
                contractValue: row.contract_value ?? null,
                renewalDate: row.renewal_date,
                noticePeriodDays: row.notice_period_days,
                warningPassedNotice: noticeWarning,
                dashboardUrl,
              }),
            });
            sent += 1;
          }
        }
      }
    }

    const customReminders = await listDueCustomRemindersForUser(
      admin,
      pref.user_id,
      todayIso,
      userResult.user?.user_metadata
    );

    const sentReminderIds: string[] = [];
    for (const reminder of customReminders) {
      await sendCustomReminderEmail(email, reminder);
      sentReminderIds.push(reminder.id);
      sent += 1;
    }

    if (sentReminderIds.length > 0) {
      await markCustomRemindersSent(
        admin,
        pref.user_id,
        sentReminderIds,
        userResult.user?.user_metadata
      );
    }
  }

  return NextResponse.json({ sent });
}

export async function GET(request: Request) {
  return runSendReminders(request);
}

export async function POST(request: Request) {
  return runSendReminders(request);
}
