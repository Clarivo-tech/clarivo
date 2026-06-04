import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email/send";
import { trialReminderEmail } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  return Boolean(expected && provided && expected === provided);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  const { data: rows, error } = await admin
    .from("user_preferences")
    .select("user_id, first_name")
    .lte("trial_expires_at", twoDaysFromNow.toISOString())
    .eq("subscription_status", "trial")
    .eq("reminder_sent", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sentUserIds: string[] = [];

  for (const row of rows ?? []) {
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(
      row.user_id
    );
    if (userError || !userData.user?.email) continue;

    const template = trialReminderEmail({
      firstName: row.first_name ?? "there",
      upgradeUrl: `${getAppBaseUrl()}/dashboard/upgrade`,
    });
    await sendEmail({
      to: userData.user.email,
      subject: template.subject,
      html: template.html,
    });
    sentUserIds.push(row.user_id);
  }

  if (sentUserIds.length > 0) {
    await admin
      .from("user_preferences")
      .update({ reminder_sent: true, updated_at: new Date().toISOString() })
      .in("user_id", sentUserIds);
  }

  return NextResponse.json({ sent: sentUserIds.length });
}
