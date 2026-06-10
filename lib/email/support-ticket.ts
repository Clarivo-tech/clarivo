export type SupportTicketCategory =
  | "bug"
  | "question"
  | "feature"
  | "billing"
  | "other";

export const SUPPORT_TICKET_CATEGORIES: {
  value: SupportTicketCategory;
  label: string;
}[] = [
  { value: "bug", label: "Bug report" },
  { value: "question", label: "Question" },
  { value: "feature", label: "Feature request" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" },
];

export function createSupportTicketId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CLV-${stamp}-${suffix}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function categoryLabel(category: SupportTicketCategory): string {
  return (
    SUPPORT_TICKET_CATEGORIES.find((item) => item.value === category)?.label ??
    category
  );
}

export function supportTicketEmailHtml(input: {
  ticketId: string;
  category: SupportTicketCategory;
  subject: string;
  description: string;
  userName: string;
  userEmail: string;
  company: string | null;
  plan: string | null;
  userId: string;
  pageUrl: string | null;
  hasScreenshot: boolean;
}) {
  const submittedAt = new Date().toISOString();
  const safeDescription = escapeHtml(input.description).replace(/\n/g, "<br/>");

  return `
  <div style="margin:0;padding:24px;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#111;">
    <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:14px;overflow:hidden;">
      <div style="background:#F97316;padding:20px 24px;color:#fff;">
        <h1 style="margin:0;font-size:20px;line-height:1.3;">Support ticket ${escapeHtml(input.ticketId)}</h1>
        <p style="margin:8px 0 0 0;font-size:14px;opacity:0.95;">${escapeHtml(categoryLabel(input.category))} · ${escapeHtml(input.subject)}</p>
      </div>
      <div style="padding:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;width:140px;">Ticket ID</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${escapeHtml(input.ticketId)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Category</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(categoryLabel(input.category))}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">User</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(input.userName)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;"><a href="mailto:${escapeHtml(input.userEmail)}" style="color:#F97316;">${escapeHtml(input.userEmail)}</a></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Company</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(input.company ?? "—")}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Plan</td><td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(input.plan ?? "—")}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">User ID</td><td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${escapeHtml(input.userId)}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Page URL</td><td style="padding:8px;border-bottom:1px solid #eee;">${input.pageUrl ? `<a href="${escapeHtml(input.pageUrl)}" style="color:#F97316;">${escapeHtml(input.pageUrl)}</a>` : "—"}</td></tr>
          <tr><td style="padding:8px;color:#666;">Submitted</td><td style="padding:8px;">${submittedAt}</td></tr>
        </table>
        <div style="border:1px solid #eee;border-radius:10px;padding:16px;margin-bottom:16px;">
          <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#666;">Description</p>
          <p style="margin:0;font-size:15px;line-height:1.6;">${safeDescription}</p>
        </div>
        ${
          input.hasScreenshot
            ? `<p style="margin:0 0 16px 0;font-size:14px;color:#444;">📎 Screenshot attached to this email.</p>`
            : `<p style="margin:0 0 16px 0;font-size:14px;color:#888;">No screenshot was attached.</p>`
        }
        <a href="mailto:${escapeHtml(input.userEmail)}?subject=Re:%20${encodeURIComponent(input.ticketId)}" style="display:inline-block;background:#F97316;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
          Reply to ${escapeHtml(input.userName)}
        </a>
      </div>
      <div style="padding:14px 24px;border-top:1px solid #eee;color:#777;font-size:12px;">Clarivo Support · clarivo-tech.com</div>
    </div>
  </div>`;
}
