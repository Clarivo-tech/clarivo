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
  try {
    const result = await resend.emails.send({
      from: "Clarivo <hello@clarivo-tech.com>",
      to,
      subject,
      html,
    });
    console.log("[email] sent:", result);
    return result;
  } catch (error) {
    console.error("[email] failed:", error);
  }
}
