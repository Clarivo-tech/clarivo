"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ADD_LICENSES_PAGE_PATH,
  UPGRADE_PAGE_PATH,
} from "@/lib/billing/payment-link";
import { Loader2, Mail, Ticket, UserPlus, Users } from "lucide-react";
import {
  cancelInvite,
  removeMember,
  resendInvite,
} from "@/app/dashboard/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  displayRoleLabel,
  normalizeOrganisationRole,
  roleBadgeClass,
} from "@/lib/team/roles";
import { formatDomainHint } from "@/lib/team/email-domain";
import type {
  OrgContext,
  TeamInvite,
  TeamMemberRow,
  TeamPageLicenseInfo,
} from "@/lib/team/types";
import { cn } from "@/lib/utils";

const teamCardClassName =
  "border-zinc-200/80 bg-white text-zinc-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-foreground/10";

const teamCardTitleClassName = "font-sans text-base font-semibold text-zinc-900";

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function initials(first: string, last: string, email: string): string {
  const a = first.charAt(0);
  const b = last.charAt(0);
  if (a && b) return `${a}${b}`.toUpperCase();
  if (a) return a.toUpperCase();
  return email.charAt(0).toUpperCase() || "?";
}

function LicenseSummaryCard({
  licenses,
  organisationName,
}: {
  licenses: TeamPageLicenseInfo;
  organisationName: string;
}) {
  const usedPercent =
    licenses.purchased > 0
      ? Math.min(100, Math.round((licenses.utilized / licenses.purchased) * 100))
      : 0;

  return (
    <Card className={teamCardClassName}>
      <CardHeader className="border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-2">
          <Ticket className="size-5 text-[#F97316]" />
          <CardTitle className={teamCardTitleClassName}>Seat usage</CardTitle>
        </div>
        <CardDescription>
          {organisationName} — each license gives one person access to your
          organisation&apos;s contracts and data.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Purchased
            </p>
            <p className="mt-1 text-3xl font-semibold text-zinc-900">
              {licenses.purchased}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Utilised
            </p>
            <p className="mt-1 text-3xl font-semibold text-[#111827]">
              {licenses.utilized}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Active members and pending invites
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Available
            </p>
            <p className="mt-1 text-3xl font-semibold text-emerald-600">
              {licenses.available}
            </p>
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs text-zinc-500">
            <span>Licenses in use</span>
            <span>
              {licenses.utilized} / {licenses.purchased}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-[#F97316] transition-all"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>
        {licenses.allowedEmailDomain && (
          <p className="mt-4 text-sm text-zinc-600">
            Team members must use a{" "}
            <strong className="text-zinc-900">
              {formatDomainHint(licenses.allowedEmailDomain)}
            </strong>{" "}
            work email to join and see your organisation&apos;s data.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UpgradeCtaCard({ isOwner }: { isOwner: boolean }) {
  return (
    <Card className="border-2 border-[#F97316]/40 bg-orange-50">
      <CardHeader>
        <CardTitle className={teamCardTitleClassName}>
          Upgrade to Pro
        </CardTitle>
        <CardDescription>
          {isOwner
            ? "Your free trial has ended or you have not upgraded yet. Choose how many licenses you need, then invite colleagues on this page."
            : "Ask your workspace owner to upgrade and purchase licenses before you can invite teammates."}
        </CardDescription>
      </CardHeader>
      {isOwner ? (
        <CardContent>
          <Button
            render={<Link href={UPGRADE_PAGE_PATH} />}
            className="bg-[#F97316] text-white hover:bg-[#111827]"
          >
            Choose licenses & upgrade
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

function InviteTeamMemberCard({
  context,
  licenses,
  canInvite,
  canPurchaseLicenses,
}: {
  context: OrgContext;
  licenses: TeamPageLicenseInfo;
  canInvite: boolean;
  canPurchaseLicenses: boolean;
}) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [invitePending, startInviteTransition] = useTransition();

  const domainHint = formatDomainHint(licenses.allowedEmailDomain);
  const placeholder = licenses.allowedEmailDomain
    ? `colleague@${licenses.allowedEmailDomain}`
    : "colleague@company.com";

  if (!canInvite) {
    return (
      <Card className={teamCardClassName}>
        <CardHeader>
          <CardTitle className={teamCardTitleClassName}>Invite teammates</CardTitle>
          <CardDescription>
            You do not have permission to invite teammates. Ask your workspace
            owner if you need access.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!licenses.isSubscribed) {
    return null;
  }

  if (licenses.available <= 0) {
    return (
      <Card className={teamCardClassName}>
        <CardHeader>
          <CardTitle className={teamCardTitleClassName}>No licenses available</CardTitle>
          <CardDescription>
            All {licenses.purchased} licenses are in use. Cancel a pending invite
            {canPurchaseLicenses
              ? " or purchase more licenses to invite someone else."
              : " or ask your workspace owner to purchase more licenses."}
          </CardDescription>
        </CardHeader>
        {canPurchaseLicenses ? (
          <CardContent>
            <Link
              href={ADD_LICENSES_PAGE_PATH}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#F97316] px-4 text-sm font-medium text-white transition-colors hover:bg-[#111827]"
            >
              Purchase more licenses
            </Link>
          </CardContent>
        ) : null}
      </Card>
    );
  }

  function handleSendInvite() {
    setInviteError(null);
    setInviteSuccess(null);
    startInviteTransition(async () => {
      try {
        const res = await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail.trim(), role: "member" }),
        });
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          setInviteError(payload.error ?? "Failed to send invite.");
          return;
        }
        setInviteSuccess(
          `Invitation sent to ${inviteEmail.trim()}. They will receive an email with a link to join ${context.organisationName}.`
        );
        setInviteEmail("");
        router.refresh();
      } catch {
        setInviteError("Failed to send invite.");
      }
    });
  }

  return (
    <Card className="border-2 border-[#F97316]/30 bg-white shadow-md shadow-orange-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <UserPlus className="size-5 text-[#F97316]" />
          <CardTitle className={teamCardTitleClassName}>Invite team member</CardTitle>
        </div>
        <CardDescription>
          You have <strong>{licenses.available}</strong> unused license
          {licenses.available === 1 ? "" : "s"}. Send an invite link to a
          colleague with a {domainHint} email address.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="invite-email" className="text-sm font-medium">
            Work email address
          </label>
          <Input
            id="invite-email"
            type="email"
            required
            placeholder={placeholder}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            disabled={invitePending}
            className="h-11"
          />
        </div>
        {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
        {inviteSuccess && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {inviteSuccess}
          </p>
        )}
        <Button
          type="button"
          disabled={invitePending || !inviteEmail.trim()}
          className="h-11 w-full bg-[#F97316] text-white hover:bg-[#111827] sm:w-fit sm:min-w-[200px]"
          onClick={handleSendInvite}
        >
          {invitePending ? (
            <>
              <Loader2 className="animate-spin" />
              Sending invite…
            </>
          ) : (
            <>
              <Mail className="size-4" />
              Send invite link
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function SetupWorkspaceCard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSetup() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/setup-organisation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(payload.error ?? "Could not set up workspace.");
          return;
        }
        router.refresh();
      } catch {
        setError("Could not set up workspace. Try again.");
      }
    });
  }

  return (
    <Card className="border-2 border-[#F97316]/30 bg-white">
      <CardHeader>
        <CardTitle className={teamCardTitleClassName}>Set up your workspace</CardTitle>
        <CardDescription>
          Create your organisation workspace before managing licenses and
          inviting teammates.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          type="button"
          disabled={pending}
          className="w-fit bg-[#F97316] text-white hover:bg-[#111827]"
          onClick={handleSetup}
        >
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Setting up…
            </>
          ) : (
            "Create workspace"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function TeamPageClient({
  context,
  members,
  invites,
  licenses,
  canManageMembers,
  canInvite,
  canPurchaseLicenses,
  currentUserId,
}: {
  context: OrgContext | null;
  members: TeamMemberRow[];
  invites: TeamInvite[];
  licenses: TeamPageLicenseInfo;
  canManageMembers: boolean;
  canInvite: boolean;
  canPurchaseLicenses: boolean;
  currentUserId: string;
}) {
  const [actionPending, startActionTransition] = useTransition();

  if (!context) {
    return <SetupWorkspaceCard />;
  }

  const isOwner = context.role === "owner";

  return (
    <div className="flex flex-col gap-8">
      <LicenseSummaryCard
        licenses={licenses}
        organisationName={context.organisationName}
      />

      {!licenses.isSubscribed && (
        <UpgradeCtaCard isOwner={isOwner} />
      )}

      <InviteTeamMemberCard
        context={context}
        licenses={licenses}
        canInvite={canInvite}
        canPurchaseLicenses={canPurchaseLicenses}
      />

      {canInvite && invites.length > 0 && (
        <Card className={teamCardClassName}>
          <CardHeader className="border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-2">
              <Mail className="size-5 text-[#F97316]" />
              <CardTitle className={teamCardTitleClassName}>
                Pending invites
                {invites.length > 0 ? ` (${invites.length})` : ""}
              </CardTitle>
            </div>
            <CardDescription>
              Invited colleagues have seven days to accept via the link in their
              email.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-zinc-500">
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Sent</th>
                    <th className="px-4 py-3 font-medium">Expires</th>
                    <th className="px-6 py-3 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr
                      key={invite.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-6 py-4 text-zinc-900">{invite.email}</td>
                      <td className="px-4 py-4 text-zinc-600">
                        {formatDate(invite.created_at)}
                      </td>
                      <td className="px-4 py-4 text-zinc-600">
                        {formatDate(invite.expires_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={actionPending}
                            onClick={() => {
                              startActionTransition(async () => {
                                await resendInvite(invite.id);
                              });
                            }}
                          >
                            Resend
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={actionPending}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              startActionTransition(async () => {
                                await cancelInvite(invite.id);
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={teamCardClassName}>
        <CardHeader className="border-b border-zinc-100 pb-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-[#F97316]" />
            <CardTitle className={teamCardTitleClassName}>Team members</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-500">
                  <th className="px-6 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  {canManageMembers && (
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const name =
                    [member.firstName, member.lastName]
                      .filter(Boolean)
                      .join(" ") || member.email;
                  const isOwnerRow = member.role === "owner";
                  const isSelf = member.userId === currentUserId;

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-zinc-100 last:border-0"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F97316]/15 text-sm font-semibold text-[#111827]">
                            {initials(
                              member.firstName,
                              member.lastName,
                              member.email
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900">{name}</p>
                            <p className="text-zinc-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            roleBadgeClass(normalizeOrganisationRole(member.role))
                          )}
                        >
                          {displayRoleLabel(member.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-zinc-600">
                        {formatDate(member.joinedAt)}
                      </td>
                      {canManageMembers && (
                        <td className="px-6 py-4 text-right">
                          {!isOwnerRow && (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={actionPending || isSelf}
                                className="border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  if (
                                    !confirm(`Remove ${name} from the team?`)
                                  ) {
                                    return;
                                  }
                                  startActionTransition(async () => {
                                    await removeMember(member.id);
                                  });
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {licenses.isSubscribed && licenses.available > 0 && canPurchaseLicenses && (
        <p className="text-center text-sm text-zinc-500">
          Need more licenses?{" "}
          <Link
            href={ADD_LICENSES_PAGE_PATH}
            className="font-medium text-[#F97316] hover:underline"
          >
            Add licenses
          </Link>
        </p>
      )}
    </div>
  );
}
