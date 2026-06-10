import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { sendEmail } from "@/lib/email/send";
import {
  createSupportTicketId,
  supportTicketEmailHtml,
  type SupportTicketCategory,
} from "@/lib/email/support-ticket";
import { ensureUserOrganisation, getOrgContextForTeam } from "@/lib/team/org";

const SUPPORT_INBOX = "bill@clarivo-tech.com";
const MAX_SUBJECT_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
]);

function isSupportCategory(value: string): value is SupportTicketCategory {
  return ["bug", "question", "feature", "billing", "other"].includes(value);
}

function displayNameFromPreferences(
  preferences: Awaited<ReturnType<typeof getUserPreferences>>,
  metadata?: Record<string, unknown>
): string {
  const fromPrefs = preferences.display_name?.trim();
  if (fromPrefs) return fromPrefs;

  const fromParts = [preferences.first_name, preferences.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromParts) return fromParts;

  const fromMetadata = (metadata?.display_name as string | undefined)?.trim();
  if (fromMetadata) return fromMetadata;

  return "Clarivo user";
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const category = String(formData.get("category") ?? "").trim().toLowerCase();
  const subject = String(formData.get("subject") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const pageUrl = String(formData.get("pageUrl") ?? "").trim() || null;
  const screenshot = formData.get("screenshot");

  if (!isSupportCategory(category)) {
    return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
  }

  if (!subject) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }

  if (!description) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  if (subject.length > MAX_SUBJECT_LENGTH) {
    return NextResponse.json(
      { error: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return NextResponse.json(
      { error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` },
      { status: 400 }
    );
  }

  let attachment: { filename: string; content: Buffer } | undefined;

  if (screenshot instanceof File && screenshot.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(screenshot.type)) {
      return NextResponse.json(
        { error: "Screenshot must be a PNG, JPG, GIF, or WebP image." },
        { status: 400 }
      );
    }

    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json(
        { error: "Screenshot must be 5 MB or smaller." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await screenshot.arrayBuffer());
    const extension = screenshot.name.split(".").pop()?.toLowerCase() || "png";
    attachment = {
      filename: `screenshot-${Date.now()}.${extension}`,
      content: buffer,
    };
  }

  const preferences = await getUserPreferences(auth.dataSupabase, auth.effectiveUserId);
  await ensureUserOrganisation(
    auth.dataSupabase,
    auth.effectiveUserId,
    preferences.company,
    auth.user.email
  );
  const orgContext = await getOrgContextForTeam(auth.dataSupabase, auth.effectiveUserId);

  const ticketId = createSupportTicketId();
  const userName = displayNameFromPreferences(preferences, auth.user.user_metadata);
  const userEmail = auth.user.email ?? "unknown@clarivo-tech.com";
  const plan = orgContext?.isSubscribed
    ? "Pro"
    : orgContext?.plan
      ? orgContext.plan.charAt(0).toUpperCase() + orgContext.plan.slice(1)
      : null;

  try {
    await sendEmail({
      to: SUPPORT_INBOX,
      replyTo: userEmail,
      subject: `🎫 ${ticketId} — ${subject}`,
      html: supportTicketEmailHtml({
        ticketId,
        category,
        subject,
        description,
        userName,
        userEmail,
        company: preferences.company,
        plan,
        userId: auth.effectiveUserId,
        pageUrl,
        hasScreenshot: Boolean(attachment),
      }),
      attachments: attachment ? [attachment] : undefined,
    });

    return NextResponse.json({ success: true, ticketId });
  } catch (error) {
    console.error("[support] email failed:", error);
    return NextResponse.json(
      { error: "Could not submit your ticket. Please try again shortly." },
      { status: 500 }
    );
  }
}
