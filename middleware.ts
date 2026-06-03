import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAccountLocked, markTrialExpired } from "@/lib/trial/access";
import { TRIAL_EXPIRED_MESSAGE } from "@/lib/trial/constants";

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
    pathname.startsWith("/api/invite")
  );
}

function isInviteAcceptApi(pathname: string): boolean {
  return pathname === "/api/invite/accept";
}

function isTrialPaywallExempt(pathname: string): boolean {
  return (
    pathname === "/trial-expired" ||
    pathname === "/dashboard/upgrade" ||
    pathname === "/api/upgrade"
  );
}

function requiresTrialCheck(pathname: string): boolean {
  return isProtectedRoute(pathname) || pathname === "/trial-expired";
}

function withFallbackTrialExpiry(
  prefs: {
    trial_expires_at: string | null;
    subscription_status: string | null;
    trial_started_at: string | null;
    trial_used: boolean | null;
  },
  userCreatedAt: string | undefined
) {
  if (prefs.trial_expires_at || !userCreatedAt) {
    return prefs;
  }

  const status = (prefs.subscription_status ?? "").toLowerCase();
  if (status === "active" || status === "expired") {
    return prefs;
  }

  // Fallback for incomplete profile rows: derive trial expiry from auth user creation.
  // Current test setup uses a 5-minute trial window.
  const fallbackExpiry = new Date(
    new Date(userCreatedAt).getTime() + 5 * 60 * 1000
  ).toISOString();

  return {
    ...prefs,
    trial_expires_at: fallbackExpiry,
  };
}

function redirectLockedUserToUpgrade(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard/upgrade";
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
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

  if (
    user &&
    isPublicRoute(pathname) &&
    !pathname.startsWith("/invite/") &&
    pathname !== "/trial-expired"
  ) {
    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("trial_expires_at, subscription_status, trial_started_at, trial_used")
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      prefs &&
      isAccountLocked({
        ...withFallbackTrialExpiry(prefs, user.created_at),
      })
    ) {
      return redirectLockedUserToUpgrade(request);
    }

    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (!user && isProtectedRoute(pathname) && !isInviteAcceptApi(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (
    user &&
    (pathname.startsWith("/api/upload") ||
      pathname.startsWith("/api/extract") ||
      pathname.startsWith("/api/chat"))
  ) {
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    const role = membership?.role ?? "owner";
    const viewerBlocked =
      role === "viewer" &&
      (pathname.startsWith("/api/upload") ||
        pathname.startsWith("/api/extract") ||
        pathname.startsWith("/api/chat"));

    if (viewerBlocked) {
      return NextResponse.json(
        { error: "Viewers have read-only access." },
        { status: 403 }
      );
    }
  }

  if (user && requiresTrialCheck(pathname)) {
    const { data: prefs, error } = await supabase
      .from("user_preferences")
      .select("trial_expires_at, subscription_status, trial_started_at, trial_used")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[middleware] preferences lookup:", error.message);
      return supabaseResponse;
    }

    if (prefs) {
      const locked = isAccountLocked({
        ...withFallbackTrialExpiry(prefs, user.created_at),
      });

      if (locked) {
        if (prefs.subscription_status === "trial") {
          void markTrialExpired(supabase, user.id);
        }

        if (isTrialPaywallExempt(pathname)) {
          return supabaseResponse;
        }

        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: TRIAL_EXPIRED_MESSAGE },
            { status: 403 }
          );
        }

        return redirectLockedUserToUpgrade(request);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
