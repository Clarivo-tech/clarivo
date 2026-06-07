/** Vercel cron sends Authorization: Bearer; middleware uses x-cron-secret. */
export function isCronAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return false;
  }

  const authorization = request.headers.get("authorization")?.trim();
  if (authorization === `Bearer ${expected}`) {
    return true;
  }

  const headerSecret = request.headers.get("x-cron-secret")?.trim();
  return headerSecret === expected;
}
