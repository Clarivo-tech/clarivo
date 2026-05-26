"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { updateDisplayName } from "@/app/dashboard/actions";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function SettingsToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="fixed top-6 right-6 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-orange-200 bg-white px-4 py-3 shadow-lg shadow-orange-500/10"
    >
      <p className="flex-1 text-sm text-zinc-800">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs font-medium text-[#F97316] hover:text-[#EA580C]"
      >
        Dismiss
      </button>
    </div>
  );
}

function SettingsToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-medium text-zinc-900">
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        ) : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]/40",
          checked ? "bg-[#F97316]" : "bg-zinc-200"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </div>
  );
}

const cardClassName =
  "border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-foreground/10";

export function SettingsPageClient({
  email,
  initialDisplayName,
  memberSince,
}: {
  email: string;
  initialDisplayName: string;
  memberSince: string;
}) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profilePending, startProfileTransition] = useTransition();

  const [renewalEmailAlerts, setRenewalEmailAlerts] = useState(true);
  const [reminder90, setReminder90] = useState(true);
  const [reminder30, setReminder30] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const emailInitial = (email[0] ?? "?").toUpperCase();

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 5000);
  }

  function handleSaveProfile() {
    setProfileError(null);
    startProfileTransition(async () => {
      const result = await updateDisplayName(displayName);
      if (result.error) {
        setProfileError(result.error);
        return;
      }
      showToast("Profile updated successfully.");
    });
  }

  function handleSaveNotifications() {
    showToast("Notification preferences saved.");
  }

  function handleConfirmDelete() {
    setDeleteDialogOpen(false);
    showToast("Please contact support to delete your account.");
  }

  return (
    <>
      {toast ? (
        <SettingsToast message={toast} onDismiss={() => setToast(null)} />
      ) : null}

      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            Settings
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your profile, notifications, and account.
          </p>
        </div>

        <Card className={cardClassName}>
          <CardHeader className="border-b border-zinc-100">
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Your name and email shown across Clarivo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="flex items-center gap-4">
              <div
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-xl font-semibold text-white shadow-md shadow-orange-500/25"
                aria-hidden
              >
                {emailInitial}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{email}</p>
                <p className="text-xs text-zinc-500">Account avatar</p>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="display-name"
                className="text-sm font-medium text-zinc-700"
              >
                Display name
              </label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={profilePending}
                className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-zinc-700"
              >
                Email address
              </label>
              <Input
                id="email"
                value={email}
                readOnly
                disabled
                className="h-10 cursor-not-allowed bg-zinc-50 text-zinc-500"
              />
              <p className="text-xs text-zinc-500">
                Email cannot be changed
              </p>
            </div>

            {profileError ? (
              <p className="text-sm text-red-600" role="alert">
                {profileError}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="border-t border-zinc-100 bg-transparent">
            <Button
              type="button"
              onClick={handleSaveProfile}
              disabled={profilePending}
              className="bg-[#F97316] text-white hover:bg-[#EA580C]"
            >
              {profilePending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className={cardClassName}>
          <CardHeader className="border-b border-zinc-100">
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Choose how Clarivo keeps you informed about your contracts.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-zinc-100 pt-2">
            <SettingsToggle
              id="renewal-email-alerts"
              label="Email alerts for contract renewals"
              checked={renewalEmailAlerts}
              onCheckedChange={setRenewalEmailAlerts}
            />
            <SettingsToggle
              id="reminder-90"
              label="Renewal reminder 90 days before"
              checked={reminder90}
              onCheckedChange={setReminder90}
            />
            <SettingsToggle
              id="reminder-30"
              label="Renewal reminder 30 days before"
              checked={reminder30}
              onCheckedChange={setReminder30}
            />
            <SettingsToggle
              id="weekly-summary"
              label="Weekly contract summary email"
              checked={weeklySummary}
              onCheckedChange={setWeeklySummary}
            />
          </CardContent>
          <CardFooter className="border-t border-zinc-100 bg-transparent">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveNotifications}
              className="border-orange-200 text-[#F97316] hover:bg-orange-50 hover:text-[#EA580C]"
            >
              Save preferences
            </Button>
          </CardFooter>
        </Card>

        <Card className={cardClassName}>
          <CardHeader className="border-b border-zinc-100">
            <CardTitle>Account</CardTitle>
            <CardDescription>Your plan and membership details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Current plan
                </p>
                <div className="mt-2">
                  <Badge className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                    Free
                  </Badge>
                </div>
              </div>
              <Button
                type="button"
                className="bg-[#F97316] text-white hover:bg-[#EA580C]"
              >
                <Sparkles />
                Upgrade to Pro
              </Button>
            </div>
            <Separator />
            <div>
              <p className="text-sm font-medium text-zinc-500">Member since</p>
              <p className="mt-1 text-sm font-semibold text-zinc-900">
                {formatDate(memberSince)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(cardClassName, "border-red-200/60")}>
          <CardHeader className="border-b border-red-100">
            <CardTitle className="text-red-700">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for your Clarivo account.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-sm text-zinc-600">
              Permanently delete your account and all associated contract data.
            </p>
            <Button
              type="button"
              variant="destructive"
              className="mt-4"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              Are you sure? This will permanently delete your account and all
              contract data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-0 bg-transparent sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
