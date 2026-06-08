/**
 * Per Pro license, per month (GBP).
 *
 * - Local / test: defaults to £0.50 when PRICE_PER_LICENSE_GBP is unset.
 * - Production: set PRICE_PER_LICENSE_GBP=99.99 on Vercel and STRIPE_PRICE_ID
 *   to your recurring GBP price in Stripe Dashboard.
 */
export const PRICE_PER_LICENSE_GBP_PRODUCTION = 99.99;

const TEST_PRICE_PER_LICENSE_GBP = 0.5;

export function getPricePerLicenseGbp(): number {
  const raw = process.env.PRICE_PER_LICENSE_GBP?.trim();
  if (raw) {
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return TEST_PRICE_PER_LICENSE_GBP;
}

/** @deprecated Prefer getPricePerLicenseGbp() — this is fixed at module load (build time in client bundles). */
export const PRICE_PER_LICENSE_GBP = getPricePerLicenseGbp();

export const MIN_LICENSES = 1;
export const MAX_LICENSES = 100;

export function licensesToAmountPence(
  licenses: number,
  pricePerLicense = getPricePerLicenseGbp()
): number {
  return Math.round(licenses * pricePerLicense * 100);
}
