import { createHmac, timingSafeEqual } from "crypto";
import {
  getAppBaseUrl,
  getRevolutRedirectBaseUrl,
} from "@/lib/app-url";

export { getAppBaseUrl, getRevolutRedirectBaseUrl };

export const REVOLUT_MERCHANT_API_BASE = "https://merchant.revolut.com";
export const REVOLUT_API_VERSION = process.env.REVOLUT_API_VERSION ?? "2024-09-01";

export type RevolutOrder = {
  id: string;
  state?: string;
  checkout_url?: string;
  amount?: number;
  currency?: string;
};

export type RevolutWebhookPayload = {
  event?: string;
  order_id?: string;
  merchant_order_ext_ref?: string;
  subscription_id?: string;
};

export function isRevolutConfigured(): boolean {
  return Boolean(process.env.REVOLUT_MERCHANT_API_SECRET);
}

function getSecretKey(): string {
  const key = process.env.REVOLUT_MERCHANT_API_SECRET?.trim();
  if (!key) {
    throw new Error("REVOLUT_MERCHANT_API_SECRET is not configured.");
  }
  return key;
}

export async function revolutMerchantFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const secret = getSecretKey();
  const response = await fetch(`${REVOLUT_MERCHANT_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Revolut-Api-Version": REVOLUT_API_VERSION,
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

export async function createRevolutCheckoutOrder(params: {
  amountPence: number;
  currency: string;
  description: string;
  customerEmail: string;
  merchantReference: string;
  licenses: number;
  redirectUrl: string;
}): Promise<RevolutOrder> {
  const unitPrice = Math.round(params.amountPence / params.licenses);

  return revolutMerchantFetch<RevolutOrder>("/api/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amountPence,
      currency: params.currency,
      description: params.description,
      capture_mode: "automatic",
      customer: {
        email: params.customerEmail,
      },
      merchant_order_data: {
        reference: params.merchantReference,
      },
      redirect_url: params.redirectUrl,
      line_items: [
        {
          name: "Clarivo Pro license",
          type: "service",
          quantity: { value: params.licenses },
          unit_price_amount: unitPrice,
          total_amount: params.amountPence,
        },
      ],
    }),
  });
}

export async function retrieveRevolutOrder(orderId: string): Promise<RevolutOrder> {
  return revolutMerchantFetch<RevolutOrder>(`/api/orders/${orderId}`);
}

export function verifyRevolutWebhookSignature(params: {
  rawBody: string;
  timestamp: string | null;
  signatureHeader: string | null;
  signingSecret: string;
}): boolean {
  const { rawBody, timestamp, signatureHeader, signingSecret } = params;
  if (!timestamp || !signatureHeader || !signingSecret) {
    return false;
  }

  const requestTime = Number(timestamp);
  if (!Number.isFinite(requestTime)) return false;

  const ageMs = Math.abs(Date.now() - requestTime);
  if (ageMs > 5 * 60 * 1000) return false;

  const payloadToSign = `v1.${timestamp}.${rawBody}`;
  const expected = `v1=${createHmac("sha256", signingSecret)
    .update(payloadToSign)
    .digest("hex")}`;

  const provided = signatureHeader
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1="));

  return provided.some((signature) => {
    try {
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

export function isRevolutOrderPaid(state: string | undefined): boolean {
  const normalized = (state ?? "").toLowerCase();
  return (
    normalized === "completed" ||
    normalized === "authorised" ||
    normalized === "authorized" ||
    normalized === "captured" ||
    normalized === "paid"
  );
}
