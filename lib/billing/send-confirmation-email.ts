import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/admin/constants";
import { PRICE_PER_LICENSE_GBP } from "@/lib/billing/constants";
import { getAppBaseUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email/send";
import {
  founderSubscriptionPaymentEmail,
  subscriptionConfirmationEmail,
} from "@/lib/email/templates";
import { resolveCustomerProfile } from "@/lib/user-profile";

export async function sendSubscriptionConfirmationEmail(
  admin: SupabaseClient,
  params: {
    userId: string;
    organisationId: string;
    ownerEmail: string | null | undefined;
    licenses: number;
    isAddLicenses: boolean;
  }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    return;
  }

  const { data: org } = await admin
    .from("organisations")
    .select("name")
    .eq("id", params.organisationId)
    .maybeSingle();

  const profile = await resolveCustomerProfile(admin, params.userId, {
    organisationId: params.organisationId,
  });

  const { data: owner } = await admin.auth.admin.getUserById(params.userId);

  const organisationName = org?.name?.trim() || "your workspace";
  const monthlyTotal = (params.licenses * PRICE_PER_LICENSE_GBP).toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
  const monthlyTotalLabel = `${monthlyTotal} / month`;

  const template = subscriptionConfirmationEmail({
    firstName: profile.firstName,
    organisationName,
    licenses: params.licenses,
    monthlyTotalLabel,
    teamUrl: `${getAppBaseUrl()}/dashboard/team`,
    isAddLicenses: params.isAddLicenses,
  });

  const customerEmail =
    params.ownerEmail?.trim() || owner.user?.email?.trim() || "";

  if (customerEmail) {
    try {
      await sendEmail({
        to: customerEmail,
        subject: template.subject,
        html: template.html,
      });
    } catch (error) {
      console.error("[billing] confirmation email failed:", error);
    }
  }

  const founderTemplate = founderSubscriptionPaymentEmail({
    customerName: profile.customerName,
    email: customerEmail || params.ownerEmail?.trim() || owner.user?.email?.trim() || "",
    company: profile.company,
    jobTitle: profile.jobTitle,
    organisationName,
    licenses: params.licenses,
    monthlyTotalLabel,
    paymentKind: params.isAddLicenses ? "add_licenses" : "new_subscription",
  });

  if (!customerEmail) {
    console.warn("[billing] Founder payment notification skipped: no customer email.");
    return;
  }

  try {
    await sendEmail({
      to: PLATFORM_ADMIN_EMAIL,
      subject: founderTemplate.subject,
      html: founderTemplate.html,
    });
  } catch (error) {
    console.error("[billing] founder payment notification failed:", error);
  }
}
