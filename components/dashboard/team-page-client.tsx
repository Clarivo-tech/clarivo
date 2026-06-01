"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, UserPlus, Users } from "lucide-react";
import {
  cancelInvite,
  removeMember,
  resendInvite,
  updateMemberRole,
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
  INVITE_ROLE_LABELS,
  ROLE_LABELS,
  inviteRoleAccessDescription,
  roleBadgeClass,
} from "@/lib/team/roles";
import type {
  InviteRole,
  OrgContext,
  OrganisationRole,
  TeamInvite,
  TeamMemberRow,
} from "@/lib/team/types";
import { cn } from "@/lib/utils";

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

function planLabel(plan: string): string {
  const p = plan.toLowerCase();
  if (p === "pro") return "Pro";
  if (p === "business") return "Business";
  return "Trial";
}

function InviteTeamMemberCard({
  context,
  canManage,
}: {
  context: OrgContext;
  canManage: boolean;
}) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [invitePending, startInviteTransition] = useTransition();

  if (!canManage) {
    return (
      <Card className="border-zinc-200 bg-zinc-50">
        <CardHeader>
          <CardTitle className="text-base">Invite teammates</CardTitle>
          <CardDescription>
            Only owners and admins can send invitations. Ask your workspace admin
            to invite colleagues.
          </CardDescription>
        </CardHeader>
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
          body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
        });
        const payload = (await res.json()) as { error?: string };
        if (!res.ok) {
          setInviteError(payload.error ?? "Failed to send invite.");
          return;
        }
        setInviteSuccess(
          `Invitation sent to ${inviteEmail.trim()}. They can sign up via the link in their email.`
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
          <CardTitle>Invite team member</CardTitle>
        </div>
        <CardDescription>
          Email an invite link so they can sign up and join{" "}
          <strong>{context.organisationName}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-email" className="text-sm font-medium">
              Email address
            </label>
            <Input
              id="invite-email"
              type="email"
              required
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={invitePending}
              className="h-11"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:min-w-[160px]">
            <label htmlFor="invite-role" className="text-sm font-medium">
              Role
            </label>
            <select
              id="invite-role"
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as InviteRole)}
              disabled={invitePending}
            >
              {(["admin", "member", "viewer"] as const).map((r) => (
                <option key={r} value={r}>
                  {INVITE_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-sm text-zinc-600">
          <strong>{INVITE_ROLE_LABELS[inviteRole]}:</strong>{" "}
          {inviteRoleAccessDescription(inviteRole)}
        </p>
        {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
        {inviteSuccess && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {inviteSuccess}
          </p>
        )}
        <Button
          type="button"
          disabled={invitePending || !inviteEmail.trim()}
          className="h-11 w-full bg-[#F97316] text-white hover:bg-[#EA580C] sm:w-fit sm:min-w-[200px]"
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
              Send Invite
            </>
          )}
        </Button>
        <p className="text-xs text-zinc-500">
          Each additional team member requires a separate licence. You will be
          contacted to arrange payment.
        </p>
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
    <Card className="border-2 border-[#F97316]/30 bg-[#111827] text-white">
      <CardHeader>
        <CardTitle className="text-white">Set up your workspace</CardTitle>
        <CardDescription className="text-zinc-400">
          Create your organisation workspace before inviting teammates.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button
          type="button"
          disabled={pending}
          className="w-fit bg-[#F97316] text-white hover:bg-[#EA580C]"
          onClick={handleSetup}
        >
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Setting up…
            </>
          ) : (
            "Create workspace & invite members"
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
  seatsUsed,
  canManage,
  currentUserId,
  adminConfigured = true,
}: {
  context: OrgContext | null;
  members: TeamMemberRow[];
  invites: TeamInvite[];
  seatsUsed: number;
  canManage: boolean;
  currentUserId: string;
  adminConfigured?: boolean;
}) {
  const [actionPending, startActionTransition] = useTransition();

  if (!context) {
    return <SetupWorkspaceCard />;
  }

  return (
    <div className="flex flex-col gap-8">
      {!adminConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> to{" "}
          <code className="rounded bg-amber-100 px-1">.env.local</code> and restart the dev
          server for invite emails and full team admin features. The page works without it for
          basic invites if you are the workspace owner.
        </div>
      )}
      <InviteTeamMemberCard context={context} canManage={canManage} />

      {canManage && (
        <Card className="border-zinc-800 bg-[#111827] text-white shadow-lg">
          <CardHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Mail className="size-5 text-[#F97316]" />
              <CardTitle className="text-lg text-white">
                Pending invites
                {invites.length > 0 ? ` (${invites.length})` : ""}
              </CardTitle>
            </div>
            {invites.length === 0 && (
              <CardDescription className="text-zinc-400">
                No outstanding invitations. Use the form above to invite someone.
              </CardDescription>
            )}
          </CardHeader>
          {invites.length > 0 && (
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-400">
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
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
                        className="border-b border-white/5 last:border-0"
                      >
                        <td className="px-6 py-4 text-white">{invite.email}</td>
                        <td className="px-4 py-4 capitalize text-zinc-300">
                          {invite.role}
                        </td>
                        <td className="px-4 py-4 text-zinc-400">
                          {formatDate(invite.created_at)}
                        </td>
                        <td className="px-4 py-4 text-zinc-400">
                          {formatDate(invite.expires_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={actionPending}
                              className="border-white/10 bg-transparent text-white hover:bg-white/10"
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
                              className="border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10"
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
          )}
        </Card>
      )}

      <Card className="border-zinc-800 bg-[#111827] text-white shadow-lg">
        <CardHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-[#F97316]" />
            <CardTitle className="text-lg text-white">Team members</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400">
                  <th className="px-6 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  {canManage && (
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
                  const isOwner = member.role === "owner";
                  const isSelf = member.userId === currentUserId;

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F97316]/20 text-sm font-semibold text-[#F97316]">
                            {initials(
                              member.firstName,
                              member.lastName,
                              member.email
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{name}</p>
                            <p className="text-zinc-400">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                            roleBadgeClass(member.role)
                          )}
                        >
                          {ROLE_LABELS[member.role]}
                        </span>
                      </td>
                      <td className="px-4 py-4 capitalize text-zinc-300">
                        {member.status}
                      </td>
                      <td className="px-4 py-4 text-zinc-400">
                        {formatDate(member.joinedAt)}
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          {!isOwner && (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <select
                                className="h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-sm text-white"
                                value={member.role}
                                disabled={actionPending || isSelf}
                                onChange={(e) => {
                                  const role = e.target
                                    .value as OrganisationRole;
                                  startActionTransition(async () => {
                                    await updateMemberRole(member.id, role);
                                  });
                                }}
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={actionPending || isSelf}
                                className="border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300"
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

      <Card className="border-zinc-200 bg-zinc-50">
        <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900">Seat usage</p>
            <p className="mt-1 text-sm text-zinc-600">
              Current seats used:{" "}
              <strong>
                {seatsUsed} of {context.seatLimit}
              </strong>
            </p>
            <p className="text-sm text-zinc-600">
              Plan: <strong>{planLabel(context.plan)}</strong>
            </p>
          </div>
          <a
            href="mailto:hello@clarivo-tech.com"
            className="text-sm font-medium text-[#F97316] hover:text-[#EA580C] hover:underline"
          >
            Need more seats? Contact us
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
