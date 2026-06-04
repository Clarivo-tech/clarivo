import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const result = await resend.emails.send({
    from: "Clarivo <hello@clarivo-tech.com>",
    to,
    subject,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  console.log("[email] sent:", { to, id: result.data?.id });
  return result;
}
