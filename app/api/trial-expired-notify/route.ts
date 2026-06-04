import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ensureTrialExpiryNotifications,
  processExpiredTrialNotifications,
} from "@/lib/trial/notify-trial-expired";

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  return Boolean(expected && provided && expected === provided);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let userId: string | undefined;
  try {
    const body = (await request.json()) as { userId?: string };
    userId = body.userId?.trim() || undefined;
  } catch {
    userId = undefined;
  }

  if (userId) {
    const sent = await ensureTrialExpiryNotifications(userId);
    return NextResponse.json({ sent: sent ? 1 : 0, userId });
  }

  const admin = createAdminClient();
  const sent = await processExpiredTrialNotifications(admin);

  return NextResponse.json({ sent });
}
