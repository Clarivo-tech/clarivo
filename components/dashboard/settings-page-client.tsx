"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { updateBaseCurrency, updateDisplayName } from "@/app/dashboard/actions";
import {
  ADD_LICENSES_PAGE_PATH,
  UPGRADE_PAGE_PATH,
} from "@/lib/billing/payment-link";
import { SUPPORTED_CURRENCIES } from "@/lib/currency/currencies";
import type { SupportedCurrency } from "@/lib/currency/currencies";
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
        className="shrink-0 text-xs font-medium text-[#F97316] hover:text-[#111827]"
      >
        Dismiss
      </button>
    </div>
  );
}

const cardClassName =
  "border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-foreground/10";

const cardTitleClassName = "font-sans text-base font-semibold text-zinc-900";

function planDisplayName(plan: string, isSubscribed: boolean): string {
  const normalized = plan.toLowerCase();
  if (isSubscribed || normalized === "pro") return "Pro";
  if (normalized === "trial") return "Trial";
  return "Free";
}

export function SettingsPageClient({
  email,
  initialDisplayName,
  initialBaseCurrency,
  memberSince,
  plan,
  seatLimit,
  isSubscribed,
  isOwner,
}: {
  email: string;
  initialDisplayName: string;
  initialBaseCurrency: SupportedCurrency;
  memberSince: string;
  plan: string;
  seatLimit: number;
  isSubscribed: boolean;
  isOwner: boolean;
}) {
  const onPro = isSubscribed || plan.toLowerCase() === "pro";
  const planLabel = planDisplayName(plan, isSubscribed);

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [baseCurrency, setBaseCurrency] =
    useState<SupportedCurrency>(initialBaseCurrency);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [profilePending, startProfileTransition] = useTransition();
  const [preferencesPending, startPreferencesTransition] = useTransition();

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

  function handleSaveDisplayPreferences() {
    setPreferencesError(null);
    startPreferencesTransition(async () => {
      const result = await updateBaseCurrency(baseCurrency);
      if (result.error) {
        setPreferencesError(result.error);
        return;
      }
      showToast("Display preferences saved.");
    });
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
            Manage your profile, display preferences, and account.
          </p>
        </div>

        <Card className={cardClassName}>
          <CardHeader className="border-b border-zinc-100">
            <CardTitle className={cardTitleClassName}>Profile</CardTitle>
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
              className="bg-[#F97316] text-white hover:bg-[#111827]"
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
            <CardTitle className={cardTitleClassName}>
              Display Preferences
            </CardTitle>
            <CardDescription>
              Choose how monetary values are shown across your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-2">
              <label
                htmlFor="base-currency"
                className="text-sm font-medium text-zinc-700"
              >
                Base Currency
              </label>
              <select
                id="base-currency"
                value={baseCurrency}
                onChange={(e) =>
                  setBaseCurrency(e.target.value as SupportedCurrency)
                }
                disabled={preferencesPending}
                className="h-10 w-full rounded-lg border border-input bg-white px-2.5 text-sm text-zinc-900 outline-none focus-visible:border-[#F97316] focus-visible:ring-3 focus-visible:ring-[#F97316]/30 disabled:opacity-50"
              >
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">
                Contract values are converted to this currency using live
                exchange rates.
              </p>
            </div>
            {preferencesError ? (
              <p className="text-sm text-red-600" role="alert">
                {preferencesError}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="border-t border-zinc-100 bg-transparent">
            <Button
              type="button"
              onClick={handleSaveDisplayPreferences}
              disabled={preferencesPending}
              className="bg-[#F97316] text-white hover:bg-[#111827]"
            >
              {preferencesPending ? (
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
            <CardTitle className={cardTitleClassName}>Account</CardTitle>
            <CardDescription>Your plan and membership details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-500">
                  Current plan
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      onPro
                        ? "bg-[#F97316]/15 text-[#C2410C] hover:bg-[#F97316]/15"
                        : planLabel === "Trial"
                          ? "bg-amber-100 text-amber-900 hover:bg-amber-100"
                          : "bg-zinc-100 text-zinc-700 hover:bg-zinc-100"
                    }
                  >
                    {planLabel}
                  </Badge>
                  {onPro ? (
                    <span className="text-sm text-zinc-600">
                      {seatLimit} license{seatLimit === 1 ? "" : "s"} / month
                    </span>
                  ) : null}
                </div>
              </div>
              {isOwner && !onPro ? (
                <Button
                  type="button"
                  render={<Link href={UPGRADE_PAGE_PATH} />}
                  className="bg-[#F97316] text-white hover:bg-[#111827]"
                >
                  <Sparkles />
                  Upgrade to Pro
                </Button>
              ) : null}
              {isOwner && onPro ? (
                <Button
                  type="button"
                  render={<Link href={ADD_LICENSES_PAGE_PATH} />}
                  variant="outline"
                  className="border-zinc-200"
                >
                  Manage licenses
                </Button>
              ) : null}
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
            <CardTitle className={cn(cardTitleClassName, "text-red-700")}>
              Danger Zone
            </CardTitle>
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
            <DialogTitle className="font-sans text-lg font-semibold">
              Delete account?
            </DialogTitle>
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
