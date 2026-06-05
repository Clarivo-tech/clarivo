/**
 * Per Pro license, per month (GBP).
 *
 * - Local / test: defaults to £0.50 when PRICE_PER_LICENSE_GBP is unset.
 * - Production: set PRICE_PER_LICENSE_GBP=99.99 on Vercel, recreate the Revolut
 *   subscription plan (scripts/ensure-revolut-subscription-plan.ps1), and update
 *   REVOLUT_SUBSCRIPTION_PLAN_VARIATION_ID + REVOLUT_SUBSCRIPTION_LICENSE_ITEM_ID.
 */
export const PRICE_PER_LICENSE_GBP_PRODUCTION = 99.99;

const TEST_PRICE_PER_LICENSE_GBP = 0.5;

function resolvePricePerLicenseGbp(): number {
  const raw = process.env.PRICE_PER_LICENSE_GBP?.trim();
  if (raw) {
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return TEST_PRICE_PER_LICENSE_GBP;
}

export const PRICE_PER_LICENSE_GBP = resolvePricePerLicenseGbp();

export const MIN_LICENSES = 1;
export const MAX_LICENSES = 100;

export function licensesToAmountPence(licenses: number): number {
  return Math.round(licenses * PRICE_PER_LICENSE_GBP * 100);
}
