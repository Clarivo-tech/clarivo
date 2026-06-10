import type { CustomReminder } from "@/lib/data/custom-reminders";
import { sendEmail } from "@/lib/email/send";

function dashboardUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") + "/dashboard" ||
    "http://localhost:3000/dashboard"
  );
}

export function customReminderEmailHtml(reminder: CustomReminder): string {
  const url = dashboardUrl();

  return `
    <div style="font-family:Inter,Arial,sans-serif;padding:20px;">
      <h2 style="margin:0 0 8px 0;color:#F97316;">Clarivo Reminder</h2>
      <p style="margin:0 0 8px 0;">${reminder.title}</p>
      <p style="margin:0 0 8px 0;color:#555;">${reminder.notes ?? ""}</p>
      <a href="${url}" style="display:inline-block;background:#F97316;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">Open dashboard</a>
    </div>`;
}

export async function sendCustomReminderEmail(
  to: string,
  reminder: CustomReminder
): Promise<void> {
  await sendEmail({
    to,
    subject: `⏰ Reminder: ${reminder.title}`,
    html: customReminderEmailHtml(reminder),
  });
}
