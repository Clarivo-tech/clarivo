import { cookies } from "next/headers";
import {
  EFFECTIVE_USER_HEADER,
  IMPERSONATE_ADMIN_COOKIE,
  IMPERSONATE_USER_COOKIE,
} from "@/lib/admin/constants";
import { isPlatformAdmin } from "@/lib/admin/access";
import { headers } from "next/headers";

export type ImpersonationState = {
  targetUserId: string;
  adminUserId: string;
};

export function readImpersonationFromCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  adminUserId: string,
  adminEmail: string | null | undefined
): ImpersonationState | null {
  if (!isPlatformAdmin(adminEmail)) {
    return null;
  }

  const targetUserId = cookieStore.get(IMPERSONATE_USER_COOKIE)?.value?.trim();
  const cookieAdminId = cookieStore.get(IMPERSONATE_ADMIN_COOKIE)?.value?.trim();

  if (!targetUserId || cookieAdminId !== adminUserId) {
    return null;
  }

  return { targetUserId, adminUserId: adminUserId };
}

export async function resolveEffectiveUserId(
  authUserId: string,
  authEmail: string | null | undefined
): Promise<string> {
  const headerStore = await headers();
  const fromHeader = headerStore.get(EFFECTIVE_USER_HEADER)?.trim();
  if (fromHeader && isPlatformAdmin(authEmail)) {
    return fromHeader;
  }

  const cookieStore = await cookies();
  const impersonation = readImpersonationFromCookies(
    cookieStore,
    authUserId,
    authEmail
  );

  return impersonation?.targetUserId ?? authUserId;
}
