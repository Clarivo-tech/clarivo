/** Temporary test price — change back to 99 before launch. */
export const PRICE_PER_LICENSE_GBP = 0.5;
export const MIN_LICENSES = 1;
export const MAX_LICENSES = 100;

export function licensesToAmountPence(licenses: number): number {
  return licenses * PRICE_PER_LICENSE_GBP * 100;
}
