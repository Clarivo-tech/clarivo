type EmailTemplate = {
  subject: string;
  html: string;
};

function shell(title: string, headerColor: string, body: string): string {
  return `
  <div style="margin:0;padding:24px;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#111;">
    <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:14px;overflow:hidden;">
      <div style="background:${headerColor};padding:20px 24px;color:#fff;">
        <h1 style="margin:0;font-size:20px;line-height:1.3;">${title}</h1>
      </div>
      <div style="padding:24px;">
        ${body}
      </div>
      <div style="padding:16px 24px;border-top:1px solid #eee;color:#777;font-size:12px;">
        clarivo-tech.com
      </div>
    </div>
  </div>`;
}

function ctaButton(label: string, href: string): string {
  return `
  <a href="${href}" style="
    display:inline-block;
    background:#F97316;
    color:#fff;
    text-decoration:none;
    font-weight:600;
    padding:12px 18px;
    border-radius:10px;
    margin-top:14px;
  ">${label}</a>`;
}

export function welcomeEmail(
  firstName: string,
  dashboardUrl: string
): EmailTemplate {
  const subject = "Welcome to Clarivo — your trial has started";
  const html = shell(
    "Welcome to Clarivo",
    "#F97316",
    `
    <p style="margin:0 0 10px 0;font-size:16px;">Welcome to Clarivo, <strong>${firstName}</strong>!</p>
    <p style="margin:0 0 20px 0;color:#444;">Your 5-day free trial is now active.</p>
    <div style="display:grid;gap:10px;">
      <div style="border:1px solid #eee;border-radius:10px;padding:12px;"><strong>1. Upload a contract</strong><br/><span style="color:#666;">Drop in your first PDF to start extraction.</span></div>
      <div style="border:1px solid #eee;border-radius:10px;padding:12px;"><strong>2. View your dashboard</strong><br/><span style="color:#666;">See spend, renewals, and risk in one place.</span></div>
      <div style="border:1px solid #eee;border-radius:10px;padding:12px;"><strong>3. Ask the AI</strong><br/><span style="color:#666;">Get instant answers from your contracts.</span></div>
    </div>
    ${ctaButton("Go to your dashboard", dashboardUrl)}
  `
  );
  return { subject, html };
}

export function trialReminderEmail(params: {
  firstName: string;
  upgradeUrl: string;
}): EmailTemplate {
  const subject = "Your Clarivo trial ends in 2 days";
  const html = shell(
    "Trial ending soon",
    "#F97316",
    `
    <p style="margin:0 0 10px 0;font-size:16px;">Hi <strong>${params.firstName}</strong>, your free trial ends in 2 days.</p>
    <p style="margin:0;color:#444;">Without upgrading, you'll lose access to:</p>
    <ul style="margin:10px 0 0 18px;color:#444;">
      <li>Contracts workspace</li>
      <li>AI chat</li>
      <li>Renewal alerts</li>
      <li>Analytics</li>
    </ul>
    ${ctaButton("Upgrade to Pro", params.upgradeUrl)}
  `
  );
  return { subject, html };
}

export function trialExpiredEmail(params: {
  firstName: string;
  upgradeUrl: string;
}): EmailTemplate {
  const subject = "Your Clarivo trial has ended — upgrade to restore access";
  const html = shell(
    "Your trial has ended",
    "#111827",
    `
    <p style="margin:0 0 10px 0;font-size:16px;">Hi <strong>${params.firstName}</strong>, your Clarivo free trial has expired.</p>
    <p style="margin:0 0 12px 0;color:#444;">Upgrade to Pro to regain full access to your contracts, vendors, analytics, and AI chat.</p>
    <p style="margin:0 0 16px 0;color:#444;">Your data is still saved — pick up where you left off once you subscribe.</p>
    ${ctaButton("Upgrade to Pro", params.upgradeUrl)}
    <p style="margin:16px 0 0 0;color:#666;font-size:13px;">
      Or sign in and go to Settings → Upgrade if you're already logged in.
    </p>
  `
  );
  return { subject, html };
}

export function founderTrialExpiredEmail(params: {
  customerName: string;
  email: string;
  company: string;
  jobTitle?: string | null;
  trialExpiresAt: string;
  upgradeUrl: string;
}): EmailTemplate {
  const subject = `⚠️ Clarivo trial expired — ${params.company}`;
  const html = shell(
    "Trial expired",
    "#111827",
    `
    <p style="margin:0 0 16px 0;color:#444;">A user's free trial has ended and they have not upgraded yet.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.customerName}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;"><a href="mailto:${params.email}" style="color:#F97316;">${params.email}</a></td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Company</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.company}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Job title</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.jobTitle?.trim() || "—"}</td></tr>
      <tr><td style="padding:8px;color:#666;">Trial ended</td><td style="padding:8px;">${params.trialExpiresAt}</td></tr>
    </table>
    ${ctaButton("View upgrade page", params.upgradeUrl)}
    ${ctaButton("Reply to customer", `mailto:${params.email}`)}
  `
  );
  return { subject, html };
}

export function teamInviteEmail(params: {
  inviterFirstName: string;
  inviterName: string;
  organisationName: string;
  role: string;
  roleDescription: string;
  acceptUrl: string;
}): EmailTemplate {
  const subject = `${params.inviterFirstName} has invited you to join Clarivo`;
  const html = shell(
    "Clarivo",
    "#F97316",
    `
    <p style="margin:0 0 12px 0;font-size:16px;">
      <strong>${params.inviterName}</strong> has invited you to join
      <strong>${params.organisationName}</strong> on Clarivo.
    </p>
    <p style="margin:0 0 16px 0;color:#444;">
      Clarivo is an AI-powered contract intelligence platform.
    </p>
    <p style="margin:0 0 8px 0;color:#444;">
      As <strong>${params.role}</strong>, you'll be able to:
    </p>
    <p style="margin:0 0 20px 0;color:#444;">${params.roleDescription}</p>
    ${ctaButton("Accept Invitation", params.acceptUrl)}
    <p style="margin:20px 0 0 0;color:#666;font-size:13px;">
      This invite expires in 7 days.
    </p>
  `
  );
  return { subject, html };
}

export function teamInviteFounderNotificationEmail(params: {
  organisationName: string;
  inviterName: string;
  inviterEmail: string;
  inviteeEmail: string;
  role: string;
}): EmailTemplate {
  const subject = `👥 Team invite sent — ${params.organisationName}`;
  const html = `
  <div style="margin:0;padding:24px;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#111;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
      <div style="padding:18px 22px;background:#111827;color:#fff;">
        <h1 style="margin:0;font-size:18px;">${subject}</h1>
      </div>
      <div style="padding:20px 22px;font-size:14px;">
        <p style="margin:0 0 10px 0;"><strong>Organisation:</strong> ${params.organisationName}</p>
        <p style="margin:0 0 10px 0;"><strong>Invited by:</strong> ${params.inviterName} (${params.inviterEmail})</p>
        <p style="margin:0 0 10px 0;"><strong>Invitee:</strong> ${params.inviteeEmail}</p>
        <p style="margin:0;"><strong>Role:</strong> ${params.role}</p>
      </div>
      <div style="padding:14px 22px;border-top:1px solid #eee;font-size:12px;color:#777;">clarivo-tech.com</div>
    </div>
  </div>`;
  return { subject, html };
}

export function demoBookingCustomerEmail(params: {
  firstName: string;
  company: string;
  dateLabel: string;
  timeLabel: string;
}): EmailTemplate {
  const subject = `Your Clarivo demo is confirmed - ${params.dateLabel} at ${params.timeLabel}`;
  const html = shell(
    "Clarivo Demo Confirmed",
    "#F97316",
    `
    <p style="margin:0 0 10px 0;font-size:16px;">Hi <strong>${params.firstName}</strong>, your demo is confirmed.</p>
    <p style="margin:0 0 12px 0;color:#444;">
      <strong>Date:</strong> ${params.dateLabel}<br/>
      <strong>Time:</strong> ${params.timeLabel} (UK time)<br/>
      <strong>Duration:</strong> 30 minutes
    </p>
    <p style="margin:0 0 8px 0;color:#444;"><strong>What to expect:</strong></p>
    <ul style="margin:8px 0 0 18px;color:#444;">
      <li>A live walkthrough of the Clarivo platform</li>
      <li>How Clarivo can work for ${params.company}</li>
      <li>Q&A and next steps</li>
    </ul>
    <p style="margin:14px 0 0 0;color:#444;">You will receive a link to your demo shortly.</p>
    <p style="margin:14px 0 0 0;color:#444;">Need to reschedule? Email hello@clarivo-tech.com</p>
  `
  );
  return { subject, html };
}

export function demoBookingAdminEmail(params: {
  name: string;
  email: string;
  company: string;
  jobTitle?: string | null;
  dateLabel: string;
  timeLabel: string;
  notes?: string | null;
}): EmailTemplate {
  const subject = `📅 New demo booked - ${params.company} - ${params.dateLabel} at ${params.timeLabel}`;
  const html = shell(
    "New Demo Booking",
    "#F97316",
    `
    <p style="margin:0 0 12px 0;color:#444;"><strong>Name:</strong> ${params.name}</p>
    <p style="margin:0 0 12px 0;color:#444;"><strong>Email:</strong> ${params.email}</p>
    <p style="margin:0 0 12px 0;color:#444;"><strong>Company:</strong> ${params.company}</p>
    <p style="margin:0 0 12px 0;color:#444;"><strong>Job title:</strong> ${params.jobTitle || "-"}</p>
    <p style="margin:0 0 12px 0;color:#444;"><strong>Date:</strong> ${params.dateLabel}</p>
    <p style="margin:0 0 12px 0;color:#444;"><strong>Time:</strong> ${params.timeLabel}</p>
    <p style="margin:0 0 12px 0;color:#444;"><strong>Notes:</strong> ${params.notes || "-"}</p>
    ${ctaButton("Reply by email", `mailto:${params.email}`)}
  `
  );
  return { subject, html };
}

export function subscriptionConfirmationEmail(params: {
  firstName: string;
  organisationName: string;
  licenses: number;
  monthlyTotalLabel: string;
  teamUrl: string;
  isAddLicenses: boolean;
}): EmailTemplate {
  const subject = params.isAddLicenses
    ? "Your Clarivo license purchase is confirmed"
    : "Your Clarivo Pro subscription is confirmed";

  const headline = params.isAddLicenses
    ? "License purchase confirmed"
    : "Subscription confirmed";

  const intro = params.isAddLicenses
    ? `Your payment was successful. <strong>${params.organisationName}</strong> now has <strong>${params.licenses}</strong> team license${params.licenses === 1 ? "" : "s"}.`
    : `Thank you for subscribing to Clarivo Pro. <strong>${params.organisationName}</strong> is now active with <strong>${params.licenses}</strong> license${params.licenses === 1 ? "" : "s"}.`;

  const html = shell(
    headline,
    "#F97316",
    `
    <p style="margin:0 0 12px 0;font-size:16px;">Hi <strong>${params.firstName}</strong>,</p>
    <p style="margin:0 0 16px 0;color:#444;">${intro}</p>
    <div style="border:1px solid #eee;border-radius:10px;padding:14px 16px;background:#fafafa;">
      <p style="margin:0 0 8px 0;color:#444;"><strong>Workspace:</strong> ${params.organisationName}</p>
      <p style="margin:0 0 8px 0;color:#444;"><strong>Licenses:</strong> ${params.licenses}</p>
      <p style="margin:0;color:#444;"><strong>Monthly total:</strong> ${params.monthlyTotalLabel}</p>
    </div>
    <p style="margin:16px 0 0 0;color:#444;">
      You can invite teammates from My Team whenever you have available licenses.
    </p>
    ${ctaButton("Go to My Team", params.teamUrl)}
    <p style="margin:16px 0 0 0;color:#666;font-size:13px;">
      Questions about billing? Reply to this email or contact hello@clarivo-tech.com
    </p>
  `
  );

  return { subject, html };
}

export function founderSubscriptionPaymentEmail(params: {
  customerName: string;
  email: string;
  company: string;
  jobTitle?: string | null;
  organisationName: string;
  licenses: number;
  monthlyTotalLabel: string;
  paymentKind: "new_subscription" | "add_licenses";
}): EmailTemplate {
  const subject =
    params.paymentKind === "add_licenses"
      ? `💳 Clarivo license purchase — ${params.company || params.organisationName}`
      : `💳 New Clarivo Pro subscription — ${params.company || params.organisationName}`;

  const headline =
    params.paymentKind === "add_licenses"
      ? "License purchase confirmed"
      : "New Pro subscription";

  const html = shell(
    headline,
    "#111827",
    `
    <p style="margin:0 0 16px 0;color:#444;">A customer completed payment and their workspace was updated.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.customerName}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;"><a href="mailto:${params.email}" style="color:#F97316;">${params.email}</a></td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Company</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.company || "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Job title</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.jobTitle?.trim() || "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Workspace</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.organisationName}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Licenses</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.licenses}</td></tr>
      <tr><td style="padding:8px;color:#666;">Monthly total</td><td style="padding:8px;">${params.monthlyTotalLabel}</td></tr>
    </table>
    ${ctaButton("Reply to customer", `mailto:${params.email}`)}
  `
  );

  return { subject, html };
}

export function founderSubscriptionCancellationRequestEmail(params: {
  customerName: string;
  email: string;
  company: string;
  jobTitle?: string | null;
  organisationName: string;
  licenses: number;
  requestedAt: string;
}): EmailTemplate {
  const subject = `⚠️ Subscription cancellation request — ${params.company || params.organisationName}`;
  const html = shell(
    "Subscription cancellation request",
    "#DC2626",
    `
    <p style="margin:0 0 16px 0;color:#444;">A Pro customer requested subscription cancellation from Settings. Cancel manually in Stripe.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.customerName}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;"><a href="mailto:${params.email}" style="color:#F97316;">${params.email}</a></td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Company</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.company || "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Job title</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.jobTitle?.trim() || "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Workspace</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.organisationName}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Licenses</td><td style="padding:8px;border-bottom:1px solid #eee;">${params.licenses}</td></tr>
      <tr><td style="padding:8px;color:#666;">Requested at</td><td style="padding:8px;">${params.requestedAt}</td></tr>
    </table>
    ${ctaButton("Reply to customer", `mailto:${params.email}`)}
  `
  );

  return { subject, html };
}

export function founderNotificationEmail(user: {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  signedUpAt: string;
  trialExpiresAt: string;
  subject?: string;
}): EmailTemplate {
  const subject = user.subject ?? `🎉 New Clarivo signup — ${user.company}`;
  const html = `
  <div style="margin:0;padding:24px;background:#f5f5f5;font-family:Inter,Arial,sans-serif;color:#111;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
      <div style="padding:18px 22px;background:#111827;color:#fff;">
        <h1 style="margin:0;font-size:18px;line-height:1.3;">${subject}</h1>
      </div>
      <div style="padding:20px 22px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Name</td><td style="padding:8px;border-bottom:1px solid #eee;">${user.firstName} ${user.lastName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:8px;border-bottom:1px solid #eee;">${user.email}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Company</td><td style="padding:8px;border-bottom:1px solid #eee;">${user.company}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Job Title</td><td style="padding:8px;border-bottom:1px solid #eee;">${user.jobTitle}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Signed up</td><td style="padding:8px;border-bottom:1px solid #eee;">${user.signedUpAt}</td></tr>
          <tr><td style="padding:8px;color:#666;">Trial expires</td><td style="padding:8px;">${user.trialExpiresAt}</td></tr>
        </table>
      </div>
      <div style="padding:14px 22px;border-top:1px solid #eee;font-size:12px;color:#777;">Clarivo Admin</div>
    </div>
  </div>`;
  return { subject, html };
}
