import { createHash } from "node:crypto";
import { REVOLUT_MERCHANT_API_BASE } from "@/lib/billing/revolut";
import {
  licensesToAmountPence,
  PRICE_PER_LICENSE_GBP,
} from "@/lib/billing/constants";

const REVOLUT_IDEMPOTENCY_KEY_MAX = 50;

/** Revolut `Idempotency-Key` header must be ≤ 50 characters. */
export function revolutIdempotencyKey(...parts: (string | number)[]): string {
  const raw = parts.map(String).join(":");
  if (raw.length <= REVOLUT_IDEMPOTENCY_KEY_MAX) {
    return raw;
  }
  return createHash("sha256").update(raw).digest("hex").slice(0, REVOLUT_IDEMPOTENCY_KEY_MAX);
}

/** Subscriptions API requires a recent Merchant API version. */
export const REVOLUT_SUBSCRIPTIONS_API_VERSION =
  process.env.REVOLUT_SUBSCRIPTIONS_API_VERSION ?? "2026-04-20";

export const CLARIVO_LICENSE_USAGE_CODE =
  process.env.REVOLUT_SUBSCRIPTION_USAGE_ITEM_CODE?.trim() || "clarivo_license";

export type RevolutCustomer = {
  id: string;
  email: string;
};

export type RevolutSubscriptionPlan = {
  id: string;
  name: string;
  variations: Array<{
    id: string;
    phases: Array<{
      id: string;
      subscription_items?: Array<{
        id: string;
        name: string;
        type: string;
        code?: string;
        quantity: number;
        amount: number;
        currency: string;
        usage_aggregation_method?: string;
      }>;
    }>;
  }>;
};

export type RevolutSubscription = {
  id: string;
  state: string;
  customer_id: string;
  plan_id: string;
  plan_variation_id: string;
  setup_order_id?: string;
  external_reference?: string;
};

async function revolutSubscriptionsFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const secret = process.env.REVOLUT_MERCHANT_API_SECRET?.trim();
  if (!secret) {
    throw new Error("REVOLUT_MERCHANT_API_SECRET is not configured.");
  }

  const response = await fetch(`${REVOLUT_MERCHANT_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Revolut-Api-Version": REVOLUT_SUBSCRIPTIONS_API_VERSION,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let payload: T | { message?: string; error?: string } = {};
  if (text) {
    try {
      payload = JSON.parse(text) as T;
    } catch {
      throw new Error(`Revolut API returned invalid JSON (${response.status}).`);
    }
  }

  if (!response.ok) {
    const message =
      (payload as { message?: string }).message ??
      (payload as { error?: string }).error ??
      `Revolut API error (${response.status}).`;
    throw new Error(message);
  }

  return payload as T;
}

export function isRevolutSubscriptionsConfigured(): boolean {
  return Boolean(
    process.env.REVOLUT_MERCHANT_API_SECRET?.trim() &&
      (process.env.REVOLUT_SUBSCRIPTION_PLAN_VARIATION_ID?.trim() ||
        process.env.REVOLUT_AUTO_CREATE_SUBSCRIPTION_PLAN === "true")
  );
}

export function pricePerLicensePence(): number {
  return Math.round(PRICE_PER_LICENSE_GBP * 100);
}

/** True when env explicitly opts into usage-based billing helpers. */
export function usesMeteredSubscriptionPlan(): boolean {
  return Boolean(process.env.REVOLUT_SUBSCRIPTION_USAGE_ITEM_CODE?.trim());
}

export type SubscriptionVariationDetails = {
  planId: string;
  planName: string;
  variationId: string;
  primaryItem: {
    id: string;
    type: "flat" | "usage";
    amount: number;
    currency: string;
    code?: string;
    quantity?: number;
    name: string;
  };
};

let variationDetailsCache = new Map<string, SubscriptionVariationDetails>();

export async function getSubscriptionVariationDetails(
  planVariationId: string
): Promise<SubscriptionVariationDetails> {
  const cached = variationDetailsCache.get(planVariationId);
  if (cached) {
    return cached;
  }

  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams({ limit: "100" });
    if (pageToken) {
      query.set("page_token", pageToken);
    }

    const response = await revolutSubscriptionsFetch<{
      subscription_plans?: RevolutSubscriptionPlan[];
      next_page_token?: string | null;
    }>(`/api/subscription-plans?${query.toString()}`);

    for (const plan of response.subscription_plans ?? []) {
      const variation = plan.variations.find((v) => v.id === planVariationId);
      if (!variation) {
        continue;
      }

      const item = variation.phases[0]?.subscription_items?.[0];
      if (!item?.id || !item.type) {
        throw new Error(
          `Revolut plan variation ${planVariationId} has no subscription items.`
        );
      }

      const details: SubscriptionVariationDetails = {
        planId: plan.id,
        planName: plan.name,
        variationId: variation.id,
        primaryItem: {
          id: item.id,
          type: item.type as "flat" | "usage",
          amount: item.amount,
          currency: item.currency,
          code: item.code,
          quantity: item.quantity,
          name: item.name,
        },
      };

      variationDetailsCache.set(planVariationId, details);
      return details;
    }

    pageToken = response.next_page_token ?? undefined;
  } while (pageToken);

  throw new Error(
    `Revolut plan variation ${planVariationId} was not found. Re-run scripts/ensure-revolut-subscription-plan.ps1 and update REVOLUT_SUBSCRIPTION_PLAN_VARIATION_ID.`
  );
}

export async function isUsageBillingVariation(
  planVariationId: string
): Promise<boolean> {
  const details = await getSubscriptionVariationDetails(planVariationId);
  return details.primaryItem.type === "usage";
}

export function expectedMonthlyAmountPence(
  details: SubscriptionVariationDetails,
  licenses: number
): number {
  return Math.round(details.primaryItem.amount * licenses);
}

export function validateVariationUnitPrice(
  details: SubscriptionVariationDetails
): string | null {
  const expected = pricePerLicensePence();
  if (details.primaryItem.amount !== expected) {
    return `Revolut plan charges ${details.primaryItem.amount} pence/license but PRICE_PER_LICENSE_GBP is ${PRICE_PER_LICENSE_GBP} (${expected} pence). Recreate the plan or update pricing.`;
  }
  return null;
}

export async function findOrCreateRevolutCustomer(
  email: string,
  fullName?: string | null
): Promise<RevolutCustomer> {
  const normalized = email.trim().toLowerCase();
  const list = await revolutSubscriptionsFetch<{
    items?: RevolutCustomer[];
  }>(`/api/customers?email=${encodeURIComponent(normalized)}`);

  const existing = list.items?.find(
    (c) => c.email.trim().toLowerCase() === normalized
  );
  if (existing) return existing;

  return revolutSubscriptionsFetch<RevolutCustomer>("/api/customers", {
    method: "POST",
    body: JSON.stringify({
      email: normalized,
      ...(fullName ? { full_name: fullName } : {}),
    }),
  });
}

/** Monthly metered plan: bill by active license count (latest usage each cycle). */
export async function createClarivoMeteredSubscriptionPlan(): Promise<{
  planId: string;
  variationId: string;
  usageItemCode: string;
}> {
  const unitPence = pricePerLicensePence();

  const plan = await revolutSubscriptionsFetch<RevolutSubscriptionPlan>(
    "/api/subscription-plans",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Clarivo Pro",
        variations: [
          {
            phases: [
              {
                ordinal: 1,
                cycle_duration: "P1M",
                subscription_items: [
                  {
                    name: "Clarivo Pro license",
                    type: "usage",
                    unit: "license",
                    code: CLARIVO_LICENSE_USAGE_CODE,
                    amount: unitPence,
                    currency: "GBP",
                    usage_aggregation_method: "latest",
                  },
                ],
              },
            ],
          },
        ],
      }),
    }
  );

  const variation = plan.variations[0];
  const item = variation?.phases[0]?.subscription_items?.[0];

  if (!variation?.id || !item?.code) {
    throw new Error("Revolut did not return metered plan variation or item code.");
  }

  return {
    planId: plan.id,
    variationId: variation.id,
    usageItemCode: item.code,
  };
}

/** Legacy flat per-seat plan (quantity set on subscription create / patch). */
export async function createClarivoFlatSubscriptionPlan(): Promise<{
  planId: string;
  variationId: string;
  licenseItemId: string;
}> {
  const unitPence = pricePerLicensePence();

  const plan = await revolutSubscriptionsFetch<RevolutSubscriptionPlan>(
    "/api/subscription-plans",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Clarivo Pro (flat)",
        variations: [
          {
            phases: [
              {
                ordinal: 1,
                cycle_duration: "P1M",
                subscription_items: [
                  {
                    name: "Clarivo Pro license",
                    type: "flat",
                    unit: "license",
                    quantity: 1,
                    amount: unitPence,
                    currency: "GBP",
                  },
                ],
              },
            ],
          },
        ],
      }),
    }
  );

  const variation = plan.variations[0];
  const item = variation?.phases[0]?.subscription_items?.[0];

  if (!variation?.id || !item?.id) {
    throw new Error("Revolut did not return flat plan variation or item ids.");
  }

  return {
    planId: plan.id,
    variationId: variation.id,
    licenseItemId: item.id,
  };
}

export async function createClarivoSubscriptionPlan(): Promise<{
  planId: string;
  variationId: string;
  licenseItemId: string | null;
  usageItemCode: string | null;
}> {
  if (usesMeteredSubscriptionPlan()) {
    const metered = await createClarivoMeteredSubscriptionPlan();
    return {
      planId: metered.planId,
      variationId: metered.variationId,
      licenseItemId: null,
      usageItemCode: metered.usageItemCode,
    };
  }

  const flat = await createClarivoFlatSubscriptionPlan();
  return {
    planId: flat.planId,
    variationId: flat.variationId,
    licenseItemId: flat.licenseItemId,
    usageItemCode: null,
  };
}

export async function reportSubscriptionLicenseUsage(params: {
  subscriptionId: string;
  quantity: number;
  idempotencyKey: string;
  usageItemCode?: string;
}): Promise<void> {
  await revolutSubscriptionsFetch("/api/subscription-usages", {
    method: "POST",
    headers: {
      "Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      subscription_id: params.subscriptionId,
      subscription_item_code:
        params.usageItemCode?.trim() || CLARIVO_LICENSE_USAGE_CODE,
      usage_date: new Date().toISOString(),
      quantity: params.quantity,
    }),
  });
}

export async function patchRevolutSubscriptionLicenseQuantity(params: {
  subscriptionId: string;
  licenseItemId: string;
  quantity: number;
}): Promise<RevolutSubscription> {
  return revolutSubscriptionsFetch<RevolutSubscription>(
    `/api/subscriptions/${params.subscriptionId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        phases: [
          {
            subscription_items: [
              {
                id: params.licenseItemId,
                quantity: params.quantity,
              },
            ],
          },
        ],
      }),
    }
  );
}

export async function updateRevolutSubscriptionLicenseCount(params: {
  planVariationId: string;
  subscriptionId: string;
  licenseItemId: string | null;
  quantity: number;
  idempotencyKey: string;
}): Promise<void> {
  const plan = await getSubscriptionVariationDetails(params.planVariationId);

  if (plan.primaryItem.type === "usage") {
    await reportSubscriptionLicenseUsage({
      subscriptionId: params.subscriptionId,
      quantity: params.quantity,
      idempotencyKey: params.idempotencyKey,
      usageItemCode: plan.primaryItem.code,
    });
    return;
  }

  const licenseItemId = params.licenseItemId ?? plan.primaryItem.id;
  await patchRevolutSubscriptionLicenseQuantity({
    subscriptionId: params.subscriptionId,
    licenseItemId,
    quantity: params.quantity,
  });
}

export async function createRevolutSubscription(params: {
  planVariationId: string;
  licenseItemId?: string;
  customerId: string;
  licenses: number;
  externalReference: string;
  setupOrderRedirectUrl: string;
}): Promise<RevolutSubscription> {
  const plan = await getSubscriptionVariationDetails(params.planVariationId);
  const priceWarning = validateVariationUnitPrice(plan);
  if (priceWarning) {
    console.warn("[revolut]", priceWarning);
  }

  const body: Record<string, unknown> = {
    plan_variation_id: params.planVariationId,
    customer_id: params.customerId,
    external_reference: params.externalReference,
    setup_order_redirect_url: params.setupOrderRedirectUrl,
    trial_duration: "P0D",
  };

  if (plan.primaryItem.type === "flat" && params.licenses > 0) {
    const licenseItemId = params.licenseItemId ?? plan.primaryItem.id;
    body.phases = [
      {
        subscription_items: [
          {
            id: licenseItemId,
            quantity: params.licenses,
          },
        ],
      },
    ];
  }

  const subscription = await revolutSubscriptionsFetch<RevolutSubscription>(
    "/api/subscriptions",
    {
      method: "POST",
      headers: {
        "Idempotency-Key": revolutIdempotencyKey("sub", params.externalReference),
      },
      body: JSON.stringify(body),
    }
  );

  if (plan.primaryItem.type === "usage" && params.licenses > 0 && subscription.id) {
    await reportSubscriptionLicenseUsage({
      subscriptionId: subscription.id,
      quantity: params.licenses,
      idempotencyKey: revolutIdempotencyKey("initial", subscription.id),
      usageItemCode: plan.primaryItem.code,
    });
  }

  return subscription;
}

export async function retrieveRevolutSubscription(
  subscriptionId: string
): Promise<RevolutSubscription> {
  return revolutSubscriptionsFetch<RevolutSubscription>(
    `/api/subscriptions/${subscriptionId}`
  );
}

export function isRevolutSubscriptionActive(state: string | undefined): boolean {
  return (state ?? "").toLowerCase() === "active";
}

export function isRevolutSubscriptionPending(state: string | undefined): boolean {
  return (state ?? "").toLowerCase() === "pending";
}

export function subscriptionMonthlyAmountPence(licenses: number): number {
  return licensesToAmountPence(licenses);
}
