import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  emailMatchesOrganisationDomain,
  formatDomainHint,
} from "@/lib/team/email-domain";

export async function POST(request: Request) {
  let body: {
    token?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Invite token is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: invite, error: inviteError } = await admin
    .from("invites")
    .select("id, organisation_id, email, role, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json({ error: "This invite is no longer valid." }, { status: 400 });
  }

  if (new Date(invite.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invite has expired." }, { status: 400 });
  }

  const { data: org } = await admin
    .from("organisations")
    .select("plan, allowed_email_domain")
    .eq("id", invite.organisation_id as string)
    .maybeSingle();

  const inviteEmail = (invite.email as string).toLowerCase();
  if (!emailMatchesOrganisationDomain(inviteEmail, org?.allowed_email_domain)) {
    return NextResponse.json(
      {
        error: `This invite requires a ${formatDomainHint(org?.allowed_email_domain)} work email.`,
      },
      { status: 400 }
    );
  }

  const orgIsPro = (org?.plan as string | undefined)?.toLowerCase() === "pro";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const firstName = body.firstName?.trim();
    const lastName = body.lastName?.trim();
    const password = body.password;

    if (!firstName || !lastName || !password) {
      return NextResponse.json(
        { error: "Account details are required to accept this invite." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: inviteEmail,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    const newUserId = signUpData.user?.id;
    if (!newUserId) {
      return NextResponse.json(
        { error: "Account created, but user id was missing." },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();
    await admin.from("user_preferences").upsert(
      {
        user_id: newUserId,
        first_name: firstName,
        last_name: lastName,
        organisation_id: invite.organisation_id,
        subscription_status: orgIsPro ? "active" : "trial",
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

    await completeInviteAccept(admin, invite, newUserId);
    return NextResponse.json({ success: true });
  }

  const sessionEmail = (user.email ?? "").toLowerCase();
  if (sessionEmail !== inviteEmail) {
    return NextResponse.json(
      {
        error: `Please sign in as ${inviteEmail} to accept this invite.`,
      },
      { status: 403 }
    );
  }

  const prefUpdate: {
    organisation_id: string;
    updated_at: string;
    subscription_status?: string;
  } = {
    organisation_id: invite.organisation_id as string,
    updated_at: new Date().toISOString(),
  };
  if (orgIsPro) {
    prefUpdate.subscription_status = "active";
  }
  await admin.from("user_preferences").update(prefUpdate).eq("user_id", user.id);

  await completeInviteAccept(admin, invite, user.id);
  return NextResponse.json({ success: true });
}

async function completeInviteAccept(
  admin: ReturnType<typeof createAdminClient>,
  invite: {
    id: string;
    organisation_id: string;
    email: string;
    role: string;
  },
  userId: string
) {
  const { data: existing } = await admin
    .from("organisation_members")
    .select("id")
    .eq("organisation_id", invite.organisation_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    await admin.from("organisation_members").insert({
      organisation_id: invite.organisation_id,
      user_id: userId,
      role: "member",
      invited_email: invite.email,
      status: "active",
    });
  } else {
    await admin
      .from("organisation_members")
      .update({
        role: "member",
        status: "active",
        invited_email: invite.email,
      })
      .eq("id", existing.id);
  }

  await admin
    .from("invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);
}
