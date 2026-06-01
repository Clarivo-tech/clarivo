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

export function trialReminderEmail(firstName: string): EmailTemplate {
  const subject = "Your Clarivo trial ends in 2 days";
  const html = shell(
    "Trial ending soon",
    "#F97316",
    `
    <p style="margin:0 0 10px 0;font-size:16px;">Hi <strong>${firstName}</strong>, your free trial ends in 2 days.</p>
    <p style="margin:0;color:#444;">Without upgrading, you'll lose access to:</p>
    <ul style="margin:10px 0 0 18px;color:#444;">
      <li>Contracts workspace</li>
      <li>AI chat</li>
      <li>Renewal alerts</li>
      <li>Analytics</li>
    </ul>
    ${ctaButton("Upgrade to Pro — £99/month", "https://clarivo-tech.com/upgrade")}
  `
  );
  return { subject, html };
}

export function trialExpiredEmail(firstName: string): EmailTemplate {
  const subject = "Your Clarivo trial has ended";
  const html = shell(
    "Your trial has ended",
    "#EA580C",
    `
    <p style="margin:0 0 10px 0;font-size:16px;">Hi <strong>${firstName}</strong>, your 5-day free trial has expired.</p>
    <p style="margin:0 0 8px 0;color:#444;">Upgrade now to regain full access to your contracts.</p>
    <p style="margin:0 0 0 0;color:#444;">Your contracts are waiting — don't lose visibility.</p>
    ${ctaButton("Upgrade to Pro — £99/month", "https://clarivo-tech.com/upgrade")}
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
