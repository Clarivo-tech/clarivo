import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import {
  founderNotificationEmail,
  trialExpiredEmail,
} from "@/lib/email/templates";
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
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await admin
    .from("user_preferences")
    .select(
      "user_id, first_name, last_name, company, job_title, trial_expires_at"
    )
    .lte("trial_expires_at", nowIso)
    .eq("subscription_status", "trial")
    .eq("expiry_notified", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sentUserIds: string[] = [];

  for (const row of rows ?? []) {
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(
      row.user_id
    );
    if (userError || !userData.user?.email) continue;

    const firstName = row.first_name ?? "there";
    const company = row.company ?? "Unknown";
    const email = userData.user.email;

    const expiredTemplate = trialExpiredEmail(firstName);
    await sendEmail({
      to: email,
      subject: expiredTemplate.subject,
      html: expiredTemplate.html,
    });

    const founderTemplate = founderNotificationEmail({
      firstName,
      lastName: row.last_name ?? "",
      email,
      company,
      jobTitle: row.job_title ?? "Unknown",
      signedUpAt: userData.user.created_at ?? nowIso,
      trialExpiresAt: row.trial_expires_at ?? nowIso,
      subject: `⚠️ Clarivo trial expired — ${company}`,
    });
    await sendEmail({
      to: "bill@clarivo-tech.com",
      subject: founderTemplate.subject,
      html: founderTemplate.html,
    });

    sentUserIds.push(row.user_id);
  }

  if (sentUserIds.length > 0) {
    await admin
      .from("user_preferences")
      .update({
        expiry_notified: true,
        subscription_status: "expired",
        trial_used: true,
        updated_at: new Date().toISOString(),
      })
      .in("user_id", sentUserIds);
  }

  return NextResponse.json({ sent: sentUserIds.length });
}
