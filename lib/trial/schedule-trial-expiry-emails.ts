import type { NextFetchEvent, NextRequest } from "next/server";

/** Edge-safe: schedules expiry emails via the Node API route. */
export function scheduleTrialExpiryEmails(
  event: NextFetchEvent,
  request: NextRequest,
  userId: string
): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[trial] CRON_SECRET not set; skipping expiry email schedule.");
    return;
  }

  const notifyUrl = new URL("/api/trial-expired-notify", request.nextUrl.origin);

  event.waitUntil(
    fetch(notifyUrl, {
      method: "POST",
      headers: {
        "x-cron-secret": secret,
        "content-type": "application/json",
      },
      body: JSON.stringify({ userId }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.text().catch(() => "");
          console.error(
            "[trial] expiry notify API failed:",
            response.status,
            body
          );
        }
      })
      .catch((error) => {
        console.error("[trial] expiry notify fetch failed:", error);
      })
  );
}
