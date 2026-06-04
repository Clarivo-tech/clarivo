import { redirect } from "next/navigation";
import { PLATFORM_ADMIN_EMAIL } from "@/lib/admin/constants";

export function isPlatformAdmin(email: string | null | undefined): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  return normalized === PLATFORM_ADMIN_EMAIL;
}

/** Operator account skips trial paywall unless viewing as another user. */
export function bypassesTrialRestrictions(
  email: string | null | undefined,
  impersonating: boolean
): boolean {
  return isPlatformAdmin(email) && !impersonating;
}

export function requirePlatformAdminPage(
  email: string | null | undefined
): void {
  if (!isPlatformAdmin(email)) {
    redirect("/dashboard");
  }
}
