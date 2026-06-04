/** Platform operator — only this account can access /dashboard/admin and impersonate users. */
export const PLATFORM_ADMIN_EMAIL =
  process.env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase() ||
  "bill@clarivo-tech.com";

export const IMPERSONATE_USER_COOKIE = "clarivo_impersonate_user_id";
export const IMPERSONATE_ADMIN_COOKIE = "clarivo_impersonate_admin_id";
export const EFFECTIVE_USER_HEADER = "x-clarivo-effective-user-id";

/** Max impersonation session (seconds). */
export const IMPERSONATION_MAX_AGE = 60 * 60 * 8;
