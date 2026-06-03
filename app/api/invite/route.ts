import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/auth";
import { sendEmail } from "@/lib/email/send";
import {
  teamInviteEmail,
  teamInviteFounderNotificationEmail,
} from "@/lib/email/templates";
import { getOrgContextForTeam } from "@/lib/team/org";
import { validateTeamInvite } from "@/lib/team/validate-invite";
import { canInviteMembers, emailRoleAccessDescription } from "@/lib/team/roles";
import type { InviteRole } from "@/lib/team/types";
import { getUserPreferences } from "@/lib/data/user-preferences";

const INVITE_ROLES: InviteRole[] = ["admin", "member", "viewer"];

function inviteAcceptBaseUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl) return `${appUrl}/invite`;
  return "https://clarivo-tech.com/invite";
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawEmail = body.email?.trim().toLowerCase();
  const role = (body.role as InviteRole | undefined) ?? "member";

  if (!rawEmail) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!INVITE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const context = await getOrgContextForTeam(auth.supabase, auth.user.id);
  if (!context || !canInviteMembers(context.role)) {
    return NextResponse.json(
      { error: "You do not have permission to invite team members." },
      { status: 403 }
    );
  }

  const validation = await validateTeamInvite(auth.supabase, context, rawEmail);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const email = rawEmail;

  const prefs = await getUserPreferences(auth.supabase, auth.user.id);
  const inviterFirstName =
    prefs.first_name?.trim() ||
    (auth.user.user_metadata?.first_name as string | undefined)?.trim() ||
    "Someone";
  const inviterLastName =
    prefs.last_name?.trim() ||
    (auth.user.user_metadata?.last_name as string | undefined)?.trim() ||
    "";
  const inviterName = `${inviterFirstName} ${inviterLastName}`.trim();
  const inviterEmail = auth.user.email ?? "";

  const token = randomUUID();
  const { error: insertError } = await auth.supabase.from("invites").insert({
    organisation_id: context.organisationId,
    invited_by: auth.user.id,
    email,
    role,
    token,
    status: "pending",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const acceptUrl = `${inviteAcceptBaseUrl()}/${token}`;
  const inviteTemplate = teamInviteEmail({
    inviterFirstName,
    inviterName,
    organisationName: context.organisationName,
    role: role.charAt(0).toUpperCase() + role.slice(1),
    roleDescription: emailRoleAccessDescription(role),
    acceptUrl,
  });

  const founderTemplate = teamInviteFounderNotificationEmail({
    organisationName: context.organisationName,
    inviterName,
    inviterEmail,
    inviteeEmail: email,
    role: role.charAt(0).toUpperCase() + role.slice(1),
  });

  await Promise.allSettled([
    sendEmail({
      to: email,
      subject: inviteTemplate.subject,
      html: inviteTemplate.html,
    }),
    sendEmail({
      to: "bill@clarivo-tech.com",
      subject: founderTemplate.subject,
      html: founderTemplate.html,
    }),
  ]);

  return NextResponse.json({ success: true, token });
}
