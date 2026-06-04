function isAllowedAppOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return true;
    }
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configured) {
      return url.hostname === new URL(configured).hostname;
    }
  } catch {
    return false;
  }
  return false;
}

function isLocalhostUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getConfiguredProductionBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured && !isLocalhostUrl(configured)) {
    return configured;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://clarivo-tech.com";
}

/**
 * Revolut rejects localhost in redirect URLs — always use a public HTTPS origin here.
 */
export function getRevolutRedirectBaseUrl(request?: Request): string {
  if (request) {
    const origin = request.headers.get("origin");
    if (origin && isAllowedAppOrigin(origin) && !isLocalhostUrl(origin)) {
      return origin.replace(/\/$/, "");
    }
  }

  return getConfiguredProductionBaseUrl();
}

/** App links in emails/UI; may be localhost during local dev. */
export function getAppBaseUrl(request?: Request): string {
  if (request) {
    const origin = request.headers.get("origin");
    if (origin && isAllowedAppOrigin(origin)) {
      return origin.replace(/\/$/, "");
    }

    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (host && (host.startsWith("localhost") || host.startsWith("127.0.0.1"))) {
      const proto = request.headers.get("x-forwarded-proto") ?? "http";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  if (process.env.NODE_ENV === "development") {
    const devUrl =
      process.env.NEXT_PUBLIC_DEV_APP_URL?.replace(/\/$/, "") ??
      "http://localhost:3000";
    return devUrl;
  }

  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://clarivo-tech.com";
}
