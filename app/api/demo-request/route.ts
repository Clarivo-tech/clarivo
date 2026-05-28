import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";

type DemoRequestBody = {
  name?: string;
  email?: string;
  company?: string;
};

function adminEmailHtml(input: { name: string; email: string; company: string }) {
  const requestedAt = new Date().toISOString();
  return `
  <div style="margin:0;padding:24px;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#111;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:14px;overflow:hidden;">
      <div style="background:#F97316;padding:20px 24px;color:#fff;">
        <h1 style="margin:0;font-size:20px;line-height:1.3;">Clarivo Demo Request</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 12px 0;font-size:16px;">Someone wants a demo!</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${input.name}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${input.email}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Company</td><td style="padding:8px;border-bottom:1px solid #eee;">${input.company}</td></tr>
          <tr><td style="padding:8px;color:#666;">Requested at</td><td style="padding:8px;">${requestedAt}</td></tr>
        </table>
        <a href="mailto:${input.email}" style="display:inline-block;margin-top:16px;background:#F97316;color:#fff;text-decoration:none;padding:11px 16px;border-radius:10px;font-weight:600;">
          Reply to ${input.name}
        </a>
      </div>
      <div style="padding:14px 24px;border-top:1px solid #eee;color:#777;font-size:12px;">Clarivo</div>
    </div>
  </div>`;
}

function requesterEmailHtml(input: { name: string }) {
  return `
  <div style="margin:0;padding:24px;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#111;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:14px;overflow:hidden;">
      <div style="background:#F97316;padding:20px 24px;color:#fff;">
        <h1 style="margin:0;font-size:20px;line-height:1.3;">Clarivo Demo Request</h1>
      </div>
      <div style="padding:24px;">
        <p style="margin:0 0 12px 0;">Hi <strong>${input.name}</strong>, thanks for your interest in Clarivo!</p>
        <p style="margin:0 0 12px 0;color:#444;">We've received your demo request and will be in touch within 24 hours to schedule a time that works for you.</p>
        <p style="margin:0 0 12px 0;color:#444;">In the meantime, why not start your free 5-day trial?</p>
        <a href="https://clarivo-tech.com/signup" style="display:inline-block;background:#F97316;color:#fff;text-decoration:none;padding:11px 16px;border-radius:10px;font-weight:600;">
          Start free trial
        </a>
      </div>
      <div style="padding:14px 24px;border-top:1px solid #eee;color:#777;font-size:12px;">clarivo-tech.com</div>
    </div>
  </div>`;
}

export async function POST(request: Request) {
  let body: DemoRequestBody;
  try {
    body = (await request.json()) as DemoRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const company = body.company?.trim();
  if (!name || !email || !company) {
    return NextResponse.json(
      { error: "name, email and company are required." },
      { status: 400 }
    );
  }

  await Promise.all([
    sendEmail({
      to: "bill@clarivo-tech.com",
      subject: `🗓️ New demo request — ${company}`,
      html: adminEmailHtml({ name, email, company }),
    }),
    sendEmail({
      to: email,
      subject: "Demo request received — we'll be in touch shortly",
      html: requesterEmailHtml({ name }),
    }),
  ]);

  return NextResponse.json({ success: true });
}
