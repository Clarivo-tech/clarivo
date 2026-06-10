import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type EmailAttachment = {
  filename: string;
  content: Buffer;
};

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const result = await resend.emails.send({
    from: "Clarivo <hello@clarivo-tech.com>",
    to,
    subject,
    html,
    replyTo,
    attachments: attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
    })),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  console.log("[email] sent:", { to, id: result.data?.id });
  return result;
}
