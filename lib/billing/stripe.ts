import Stripe from "stripe";
import { getConfiguredProductionBaseUrl } from "@/lib/app-url";
import { licensesToAmountPence } from "@/lib/billing/constants";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && getStripePriceId()
  );
}

export function getStripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID?.trim();
  if (!priceId) {
    throw new Error(
      "STRIPE_PRICE_ID is not configured. Create a recurring GBP price in Stripe Dashboard and add it to your environment."
    );
  }
  return priceId;
}

export function getStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secret);
  }

  return stripeClient;
}

/** Stripe Checkout requires a public HTTPS origin for success/cancel URLs. */
export function getStripeRedirectBaseUrl(request?: Request): string {
  if (request) {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        const url = new URL(origin);
        if (
          url.hostname !== "localhost" &&
          url.hostname !== "127.0.0.1"
        ) {
          return origin.replace(/\/$/, "");
        }
      } catch {
        // ignore
      }
    }
  }

  return getConfiguredProductionBaseUrl();
}

export function isStripeSubscriptionActive(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

export async function findOrCreateStripeCustomer(params: {
  email: string;
  name?: string;
  organisationId: string;
  userId: string;
}): Promise<Stripe.Customer> {
  const stripe = getStripe();
  const existing = await stripe.customers.list({
    email: params.email,
    limit: 1,
  });

  const match = existing.data.find(
    (customer) =>
      customer.metadata?.clarivo_organisation_id === params.organisationId
  );

  if (match) {
    return match;
  }

  if (existing.data[0] && !existing.data[0].metadata?.clarivo_organisation_id) {
    return stripe.customers.update(existing.data[0].id, {
      name: params.name,
      metadata: {
        clarivo_organisation_id: params.organisationId,
        clarivo_user_id: params.userId,
      },
    });
  }

  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      clarivo_organisation_id: params.organisationId,
      clarivo_user_id: params.userId,
    },
  });
}

export async function createSubscriptionCheckoutSession(params: {
  request: Request;
  customerId: string;
  licenses: number;
  merchantReference: string;
  organisationId: string;
  userId: string;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  const priceId = getStripePriceId();
  const appBase = getStripeRedirectBaseUrl(params.request);
  const successUrl = `${appBase}/dashboard/team?billing=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appBase}/dashboard/upgrade`;

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: params.customerId,
    line_items: [
      {
        price: priceId,
        quantity: params.licenses,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: params.merchantReference,
    metadata: {
      clarivo_merchant_reference: params.merchantReference,
      clarivo_organisation_id: params.organisationId,
      clarivo_user_id: params.userId,
      clarivo_licenses: String(params.licenses),
    },
    subscription_data: {
      metadata: {
        clarivo_merchant_reference: params.merchantReference,
        clarivo_organisation_id: params.organisationId,
        clarivo_user_id: params.userId,
      },
    },
  });
}

export async function updateStripeSubscriptionQuantity(params: {
  subscriptionId: string;
  quantity: number;
}): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(params.subscriptionId);
  const item = subscription.items.data[0];

  if (!item) {
    throw new Error("Stripe subscription has no line items.");
  }

  return stripe.subscriptions.update(params.subscriptionId, {
    items: [
      {
        id: item.id,
        quantity: params.quantity,
      },
    ],
    proration_behavior: "always_invoice",
    metadata: {
      ...subscription.metadata,
      clarivo_licenses: String(params.quantity),
    },
  });
}

export function subscriptionQuantity(subscription: Stripe.Subscription): number {
  const quantity = subscription.items.data[0]?.quantity;
  return typeof quantity === "number" && quantity > 0 ? quantity : 1;
}

export function subscriptionAmountPence(
  licenses: number,
  currency = "gbp"
): number {
  if (currency.toLowerCase() !== "gbp") {
    return licensesToAmountPence(licenses);
  }
  return licensesToAmountPence(licenses);
}
