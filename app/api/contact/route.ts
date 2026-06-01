import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";

type ContactBody = {
  name?: string;
  email?: string;
  message?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function contactEmailHtml(input: {
  name: string;
  email: string;
  message: string;
}) {
  const submittedAt = new Date().toISOString();
  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br/>");

  return `
  <div style="margin:0;padding:24px;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#111;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:14px;overflow:hidden;">
      <div style="background:#F97316;padding:20px 24px;color:#fff;">
        <h1 style="margin:0;font-size:20px;line-height:1.3;">Clarivo contact enquiry</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px 0;font-size:16px;">New message from the landing page</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;width:120px;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(input.name)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(input.email)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;vertical-align:top;">Message</td><td style="padding:8px;border-bottom:1px solid #eee;">${safeMessage}</td></tr>
          <tr><td style="padding:8px;color:#666;">Submitted</td><td style="padding:8px;">${submittedAt}</td></tr>
        </table>
        <a href="mailto:${escapeHtml(input.email)}" style="display:inline-block;margin-top:16px;background:#F97316;color:#fff;text-decoration:none;padding:11px 16px;border-radius:10px;font-weight:600;">
          Reply to ${escapeHtml(input.name)}
        </a>
      </div>
      <div style="padding:14px 24px;border-top:1px solid #eee;color:#777;font-size:12px;">clarivo-tech.com</div>
    </div>
  </div>`;
}

export async function POST(request: Request) {
  let body: ContactBody;
  try {
    body = (await request.json()) as ContactBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const message = body.message?.trim();

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Message must be 5,000 characters or fewer." },
      { status: 400 }
    );
  }

  try {
    await sendEmail({
      to: "bill@clarivo-tech.com",
      subject: `✉️ Contact enquiry — ${name}`,
      html: contactEmailHtml({ name, email, message }),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[contact] email failed:", error);
    return NextResponse.json(
      { error: "Could not send your message. Please try again later." },
      { status: 500 }
    );
  }
}
