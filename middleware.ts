import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/signup"] as const;

function isPublicRoute(pathname: string): boolean {
  return (PUBLIC_ROUTES as readonly string[]).includes(pathname);
}

function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/extract") ||
    pathname.startsWith("/api/chat")
  );
}

function buildTrialWindow() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 5);
  return {
    trial_started_at: start.toISOString(),
    trial_expires_at: end.toISOString(),
    subscription_status: "trial",
  } as const;
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

  if (user && isPublicRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/dashboard")) {
    const { data: prefs, error } = await supabase
      .from("user_preferences")
      .select("trial_expires_at, subscription_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[middleware] preferences lookup:", error.message);
      return supabaseResponse;
    }

    let effectivePrefs = prefs;
    if (!effectivePrefs) {
      const trialDefaults = buildTrialWindow();
      const { data: created, error: createError } = await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: user.id,
            ...trialDefaults,
          },
          { onConflict: "user_id" }
        )
        .select("trial_expires_at, subscription_status")
        .single();

      if (createError) {
        console.error("[middleware] preferences create:", createError.message);
        return supabaseResponse;
      }
      effectivePrefs = created;
    }

    const status = effectivePrefs?.subscription_status ?? "trial";
    const expiresAt = effectivePrefs?.trial_expires_at
      ? new Date(effectivePrefs.trial_expires_at)
      : null;
    const trialExpired = expiresAt != null && expiresAt.getTime() < Date.now();

    if (status === "trial" && trialExpired && pathname !== "/trial-expired") {
      const url = request.nextUrl.clone();
      url.pathname = "/trial-expired";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
