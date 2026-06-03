/** In-app upgrade flow (Revolut Merchant API checkout). */
export const UPGRADE_PAGE_PATH = "/dashboard/upgrade";

export const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

/** @deprecated Use in-app `/dashboard/upgrade` + Merchant API checkout. */
export function buildLicenseCheckoutUrl(_licenses?: number): string {
  return UPGRADE_PAGE_PATH;
}
