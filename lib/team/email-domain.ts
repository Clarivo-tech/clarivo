/** Extract registrable domain from email (e.g. jane@acme.co.uk → acme.co.uk). */
export function extractEmailDomain(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at < 1 || at === normalized.length - 1) return null;
  return normalized.slice(at + 1);
}

export function emailMatchesOrganisationDomain(
  email: string,
  allowedDomain: string | null | undefined
): boolean {
  if (!allowedDomain?.trim()) return true;
  const inviteDomain = extractEmailDomain(email);
  const orgDomain = allowedDomain.trim().toLowerCase();
  if (!inviteDomain) return false;
  return inviteDomain === orgDomain;
}

export function formatDomainHint(domain: string | null | undefined): string {
  if (!domain?.trim()) return "your company email domain";
  return `@${domain.trim().toLowerCase()}`;
}
