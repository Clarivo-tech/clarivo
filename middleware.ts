import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import {
  EFFECTIVE_USER_HEADER,
  IMPERSONATE_ADMIN_COOKIE,
  IMPERSONATE_USER_COOKIE,
} from "@/lib/admin/constants";
import { bypassesTrialRestrictions, isPlatformAdmin } from "@/lib/admin/access";
import { isAwaitingPayment } from "@/lib/trial/access";
import { TRIAL_EXPIRED_MESSAGE } from "@/lib/trial/constants";
import { scheduleTrialExpiryEmails } from "@/lib/trial/schedule-trial-expiry-emails";
import {
  isWorkspaceLocked,
  withFallbackTrialExpiry,
} from "@/lib/trial/workspace-access";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/trial-expired"] as const;

function isPublicRoute(pathname: string): boolean {
  if ((PUBLIC_ROUTES as readonly string[]).includes(pathname)) {
    return true;
  }
  if (pathname.startsWith("/invite/")) {
    return true;
  }
  return false;
}

function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/extract") ||
    pathname.startsWith("/api/chat") ||
    pathname.startsWith("/api/invite") ||
    pathname.startsWith("/api/support")
  );
}

function isInviteAcceptApi(pathname: string): boolean {
  return pathname === "/api/invite/accept";
}

function isTrialPaywallExempt(pathname: string): boolean {
  return (
    pathname === "/trial-expired" ||
    pathname === "/dashboard/upgrade" ||
    pathname === "/dashboard/support" ||
    pathname === "/api/upgrade" ||
    pathname === "/api/support" ||
    pathname.startsWith("/dashboard/admin") ||
    pathname.startsWith("/api/admin")
  );
}

function isPlatformAdminRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard/admin") ||
    pathname.startsWith("/api/admin")
  );
}

function readImpersonation(
  request: NextRequest,
  adminUserId: string,
  adminEmail: string | undefined
) {
  if (!isPlatformAdmin(adminEmail)) {
    return null;
  }

  const targetUserId = request.cookies
    .get(IMPERSONATE_USER_COOKIE)
    ?.value?.trim();
  const cookieAdminId = request.cookies
    .get(IMPERSONATE_ADMIN_COOKIE)
    ?.value?.trim();

  if (!targetUserId || cookieAdminId !== adminUserId) {
    return null;
  }

  return targetUserId;
}

function applyEffectiveUserHeader(
  request: NextRequest,
  response: NextResponse,
  effectiveUserId: string
) {
  const headers = new Headers(request.headers);
  headers.set(EFFECTIVE_USER_HEADER, effectiveUserId);
  return NextResponse.next({
    request: { headers },
    headers: response.headers,
  });
}

function requiresTrialCheck(pathname: string): boolean {
  return isProtectedRoute(pathname) || pathname === "/trial-expired";
}

function redirectLockedUserToUpgrade(
  request: NextRequest,
  prefs?: {
    subscription_status: string | null;
    trial_expires_at: string | null;
  } | null
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard/upgrade";
  if (
    isAwaitingPayment(
      prefs ?? { subscription_status: null, trial_expires_at: null }
    )
  ) {
    url.search = "checkout=1";
  } else if (!url.searchParams.has("payment")) {
    url.search = "";
  }
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const impersonatedUserIdEarly =
    user && !isPlatformAdminRoute(pathname)
      ? readImpersonation(request, user.id, user.email)
      : null;

  if (
    user &&
    bypassesTrialRestrictions(user.email, Boolean(impersonatedUserIdEarly))
  ) {
    if (impersonatedUserIdEarly) {
      return applyEffectiveUserHeader(
        request,
        supabaseResponse,
        impersonatedUserIdEarly
      );
    }
    return supabaseResponse;
  }

  if (
    user &&
    isPublicRoute(pathname) &&
    !pathname.startsWith("/invite/") &&
    pathname !== "/trial-expired"
  ) {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select(
        "trial_expires_at, subscription_status, trial_started_at, trial_used, expiry_notified"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      prefs &&
      (await isWorkspaceLocked(supabase, user.id, prefs, user.created_at))
    ) {
      if (!prefs.expiry_notified) {
        scheduleTrialExpiryEmails(event, request, user.id);
      }
      return redirectLockedUserToUpgrade(request, prefs);
    }

    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    isPlatformAdminRoute(pathname) &&
    !isPlatformAdmin(user.email)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const impersonatedUserId =
    user && !isPlatformAdminRoute(pathname)
      ? readImpersonation(request, user.id, user.email)
      : null;

  if (!user && isProtectedRoute(pathname) && !isInviteAcceptApi(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const returnPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.search = `redirect=${encodeURIComponent(returnPath)}`;
    return NextResponse.redirect(url);
  }

  if (user && requiresTrialCheck(pathname)) {
    const trialUserId = impersonatedUserId ?? user.id;
    let prefs: {
      trial_expires_at: string | null;
      subscription_status: string | null;
      trial_started_at: string | null;
      trial_used: boolean | null;
      expiry_notified: boolean | null;
    } | null = null;
    let trialUserCreatedAt = user.created_at;

    if (impersonatedUserId) {
      const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (serviceRole && supabaseUrl) {
        const admin = createClient(supabaseUrl, serviceRole, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data } = await admin
          .from("user_preferences")
          .select(
            "trial_expires_at, subscription_status, trial_started_at, trial_used, expiry_notified"
          )
          .eq("user_id", impersonatedUserId)
          .maybeSingle();
        prefs = data;
        const { data: targetAuth } = await admin.auth.admin.getUserById(
          impersonatedUserId
        );
        trialUserCreatedAt = targetAuth.user?.created_at ?? trialUserCreatedAt;
      }
    } else {
      const { data, error } = await supabase
        .from("user_preferences")
        .select(
          "trial_expires_at, subscription_status, trial_started_at, trial_used, expiry_notified"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[middleware] preferences lookup:", error.message);
      }
      prefs = data;
    }

    if (prefs) {
      const trialDb =
        impersonatedUserId &&
        process.env.SUPABASE_SERVICE_ROLE_KEY &&
        process.env.NEXT_PUBLIC_SUPABASE_URL
          ? createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.SUPABASE_SERVICE_ROLE_KEY,
              {
                auth: { autoRefreshToken: false, persistSession: false },
              }
            )
          : supabase;

      const locked = await isWorkspaceLocked(
        trialDb,
        trialUserId,
        withFallbackTrialExpiry(prefs, trialUserCreatedAt),
        trialUserCreatedAt
      );

      if (locked) {
        if (!prefs.expiry_notified && !impersonatedUserId) {
          scheduleTrialExpiryEmails(event, request, trialUserId);
        }

        if (isTrialPaywallExempt(pathname)) {
          if (impersonatedUserId) {
            return applyEffectiveUserHeader(
              request,
              supabaseResponse,
              impersonatedUserId
            );
          }
          return supabaseResponse;
        }

        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: TRIAL_EXPIRED_MESSAGE },
            { status: 403 }
          );
        }

        return redirectLockedUserToUpgrade(request, prefs);
      }
    }
  }

  if (impersonatedUserId) {
    return applyEffectiveUserHeader(
      request,
      supabaseResponse,
      impersonatedUserId
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
