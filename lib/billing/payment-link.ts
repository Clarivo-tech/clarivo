/** In-app upgrade flow (Stripe Checkout). */
export const UPGRADE_PAGE_PATH = "/dashboard/upgrade";

/** Add seats for an already-subscribed workspace. */
export const ADD_LICENSES_PAGE_PATH = "/dashboard/upgrade?add=1";

/** New signup — skip license picker and open Stripe Checkout. */
export const CHECKOUT_UPGRADE_PAGE_PATH = "/dashboard/upgrade?checkout=1";

export const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

/** @deprecated Use in-app `/dashboard/upgrade` + Stripe Checkout. */
export function buildLicenseCheckoutUrl(_licenses?: number): string {
  return UPGRADE_PAGE_PATH;
}
