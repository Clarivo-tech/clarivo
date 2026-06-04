import {
  createClarivoSubscriptionPlan,
  isRevolutSubscriptionsConfigured,
} from "@/lib/billing/revolut-subscriptions";

let cachedVariationId: string | null = null;
let cachedLicenseItemId: string | null = null;
let cachedUsageItemCode: string | null = null;

export async function getSubscriptionPlanConfig(): Promise<{
  planVariationId: string;
  licenseItemId: string | null;
  usageItemCode: string | null;
}> {
  const fromEnv = process.env.REVOLUT_SUBSCRIPTION_PLAN_VARIATION_ID?.trim();
  const itemFromEnv = process.env.REVOLUT_SUBSCRIPTION_LICENSE_ITEM_ID?.trim();
  const usageCodeFromEnv =
    process.env.REVOLUT_SUBSCRIPTION_USAGE_ITEM_CODE?.trim() || null;

  if (fromEnv) {
    return {
      planVariationId: fromEnv,
      licenseItemId: itemFromEnv || null,
      usageItemCode: usageCodeFromEnv,
    };
  }

  if (cachedVariationId) {
    return {
      planVariationId: cachedVariationId,
      licenseItemId: cachedLicenseItemId,
      usageItemCode: cachedUsageItemCode,
    };
  }

  if (process.env.REVOLUT_AUTO_CREATE_SUBSCRIPTION_PLAN !== "true") {
    throw new Error(
      "Set REVOLUT_SUBSCRIPTION_PLAN_VARIATION_ID (run scripts/ensure-revolut-subscription-plan.ps1) or REVOLUT_AUTO_CREATE_SUBSCRIPTION_PLAN=true."
    );
  }

  if (!isRevolutSubscriptionsConfigured()) {
    throw new Error("Revolut Merchant API is not configured.");
  }

  const created = await createClarivoSubscriptionPlan();
  cachedVariationId = created.variationId;
  cachedLicenseItemId = created.licenseItemId;
  cachedUsageItemCode = created.usageItemCode;

  return {
    planVariationId: created.variationId,
    licenseItemId: created.licenseItemId,
    usageItemCode: created.usageItemCode,
  };
}
