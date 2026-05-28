import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { sendEmail } from "@/lib/email/send";
import { founderNotificationEmail, welcomeEmail } from "@/lib/email/templates";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  let body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    company?: string;
    jobTitle?: string;
    trialExpiresAt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const sessionEmail = (auth.user.email ?? "").toLowerCase();
  if (!email || email !== sessionEmail) {
    return NextResponse.json(
      { error: "Unauthorized email target." },
      { status: 403 }
    );
  }

  const firstName = body.firstName?.trim() || "there";
  const lastName = body.lastName?.trim() || "";
  const company = body.company?.trim() || "Unknown";
  const jobTitle = body.jobTitle?.trim() || "Unknown";
  const trialExpiresAt = body.trialExpiresAt ?? new Date().toISOString();

  const dashboardUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") + "/dashboard" ||
    "http://localhost:3000/dashboard";

  const welcome = welcomeEmail(firstName, dashboardUrl);
  const founder = founderNotificationEmail({
    firstName,
    lastName,
    email,
    company,
    jobTitle,
    signedUpAt: new Date().toISOString(),
    trialExpiresAt,
  });

  try {
    const results = await Promise.allSettled([
      sendEmail({
        to: email,
        subject: welcome.subject,
        html: welcome.html,
      }),
      sendEmail({
        to: "bill@clarivo-tech.com",
        subject: founder.subject,
        html: founder.html,
      }),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[signup-notify] email send rejected:", result.reason);
      }
    }

    const emailSent = results.every((result) => result.status === "fulfilled");
    return NextResponse.json({ success: true, emailSent });
  } catch (error) {
    console.error("[signup-notify] email send failed:", error);
    return NextResponse.json({ success: true, emailSent: false });
  }
}
