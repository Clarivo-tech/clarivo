import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/admin/access";
import {
  IMPERSONATE_ADMIN_COOKIE,
  IMPERSONATE_USER_COOKIE,
  IMPERSONATION_MAX_AGE,
} from "@/lib/admin/constants";
import { createAdminClient } from "@/lib/supabase/admin";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: IMPERSONATION_MAX_AGE,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isPlatformAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const userId = body.userId?.trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: "You are already signed in as this user." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: target, error } = await admin.auth.admin.getUserById(userId);

  if (error || !target.user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const response = NextResponse.json({
    ok: true,
    userId,
    email: target.user.email,
  });

  response.cookies.set(IMPERSONATE_USER_COOKIE, userId, cookieOptions());
  response.cookies.set(IMPERSONATE_ADMIN_COOKIE, user.id, cookieOptions());

  return response;
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isPlatformAdmin(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(IMPERSONATE_USER_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  response.cookies.set(IMPERSONATE_ADMIN_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
