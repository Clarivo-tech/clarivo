export const PRICE_PER_LICENSE_GBP = 99;
export const MIN_LICENSES = 1;
export const MAX_LICENSES = 100;

export function licensesToAmountPence(licenses: number): number {
  return licenses * PRICE_PER_LICENSE_GBP * 100;
}
