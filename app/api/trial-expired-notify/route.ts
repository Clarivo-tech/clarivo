import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/auth";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  ensureTrialExpiryNotifications,
  processExpiredTrialNotifications,
} from "@/lib/trial/notify-trial-expired";

async function runTrialExpiredNotify(request: Request) {
  if (!isCronAuthorized(request)) {
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

  const admin = tryCreateAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured." },
      { status: 503 }
    );
  }

  const sent = await processExpiredTrialNotifications(admin);
  return NextResponse.json({ sent });
}

/** Vercel cron invokes this route with GET + Authorization: Bearer. */
export async function GET(request: Request) {
  return runTrialExpiredNotify(request);
}

/** Middleware triggers a single-user notify with POST + cron secret. */
export async function POST(request: Request) {
  return runTrialExpiredNotify(request);
}
