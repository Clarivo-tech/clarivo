import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDomainHint } from "@/lib/team/email-domain";
import { getInviteByToken } from "@/lib/team/invite";
import { InviteAcceptClient } from "@/components/invite/invite-accept-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <InviteShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid invitation</CardTitle>
            <CardDescription>
              This invitation link is not valid. Ask your administrator to send a
              new invite.
            </CardDescription>
          </CardHeader>
        </Card>
      </InviteShell>
    );
  }

  if (!invite.valid) {
    return (
      <InviteShell>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation unavailable</CardTitle>
            <CardDescription>{invite.error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              render={<Link href="/login" />}
              className="bg-[#F97316] text-white hover:bg-[#111827]"
            >
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </InviteShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const roleLabel = "Member";

  return (
    <InviteShell>
      <Card className="w-full max-w-md border-orange-100/80 shadow-xl">
        <CardHeader>
          <CardTitle>You&apos;ve been invited to join Clarivo</CardTitle>
          <CardDescription>
            <strong>{invite.inviterName}</strong> has invited you to join{" "}
            <strong>{invite.organisationName}</strong> as{" "}
            <strong>{roleLabel}</strong>.
            {invite.allowedEmailDomain ? (
              <>
                {" "}
                You must sign in or register with a{" "}
                <strong>{formatDomainHint(invite.allowedEmailDomain)}</strong>{" "}
                work email to access your organisation&apos;s contracts.
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-zinc-600">
                Signed in as <strong>{user.email}</strong>. Accept to join the
                team workspace.
              </p>
              <InviteAcceptClient token={token} mode="accept" />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <p className="text-sm text-zinc-600">
                  Already have an account?
                </p>
                <Button
                  render={
                    <Link href={`/login?redirect=/invite/${token}`} />
                  }
                  className="w-full bg-[#F97316] text-white hover:bg-[#111827]"
                >
                  Log in to accept
                </Button>
              </div>
              <div className="border-t border-zinc-200 pt-6">
                <p className="mb-4 text-sm font-medium text-zinc-900">
                  New to Clarivo? Create your account
                </p>
                <InviteAcceptClient
                  token={token}
                  mode="signup"
                  email={invite.email}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </InviteShell>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50/40 px-4 py-12">
      {children}
    </div>
  );
}
