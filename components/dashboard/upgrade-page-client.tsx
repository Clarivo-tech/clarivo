"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Loader2, Users } from "lucide-react";
import { PRICE_PER_LICENSE_GBP } from "@/lib/billing/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function UpgradePageClient({
  organisationName,
  currentLicenses,
  isOwner,
  paymentSuccess,
  addLicensesMode = false,
}: {
  organisationName: string;
  currentLicenses: number;
  isOwner: boolean;
  paymentSuccess?: boolean;
  addLicensesMode?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAddFromUrl = searchParams.get("add") === "1";
  const isAddMode = addLicensesMode || isAddFromUrl;
  const isPaymentReturn = searchParams.get("payment") === "success";
  const minLicenses = isAddMode ? currentLicenses + 1 : 1;
  const [licenses, setLicenses] = useState(
    isAddMode ? currentLicenses + 1 : Math.max(1, currentLicenses)
  );
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLocalDev, setIsLocalDev] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setIsLocalDev(host === "localhost" || host === "127.0.0.1");
  }, []);

  const additionalLicenses = isAddMode
    ? Math.max(0, licenses - currentLicenses)
    : licenses;
  const monthlyTotal = licenses * PRICE_PER_LICENSE_GBP;
  const priceLabel = PRICE_PER_LICENSE_GBP.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });
  const totalLabel = monthlyTotal.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
  });

  useEffect(() => {
    if (!paymentSuccess || !isOwner || !isPaymentReturn) return;

    let cancelled = false;
    let attempts = 0;

    const sync = async () => {
      if (cancelled || attempts >= 20) return;
      attempts += 1;
      setSyncing(true);
      setError(null);

      try {
        const res = await fetch("/api/billing/stripe/sync-latest", {
          method: "POST",
        });
        const payload = (await res.json()) as {
          status?: string;
          licenses?: number;
          error?: string;
        };

        if (!res.ok) {
          setError(payload.error ?? "Could not confirm payment yet.");
          return;
        }

        if (payload.status === "completed") {
          window.location.assign("/dashboard/team");
          return;
        }
      } catch {
        setError("Could not confirm payment yet. Please wait a moment.");
      } finally {
        setSyncing(false);
      }

      if (!cancelled && attempts < 20) {
        window.setTimeout(() => void sync(), 3000);
      }
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [paymentSuccess, isOwner, isPaymentReturn, licenses, router]);

  async function handleCheckout() {
    setError(null);
    setSuccessMessage(null);
    setCheckoutUrl(null);
    setLoading(true);

    try {
      const endpoint = isAddMode
        ? "/api/billing/stripe/add-licenses"
        : "/api/billing/stripe/create-subscription";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenses }),
        credentials: "same-origin",
      });

      let payload: {
        checkoutUrl?: string;
        error?: string;
        mode?: string;
        newTotal?: number;
      } = {};
      const text = await res.text();
      if (text) {
        try {
          payload = JSON.parse(text) as typeof payload;
        } catch {
          setError("Unexpected server response. Please try again.");
          return;
        }
      }

      if (!res.ok) {
        setError(payload.error ?? "Could not update billing.");
        return;
      }

      if (payload.mode === "subscription_updated") {
        router.push("/dashboard/team?billing=success");
        return;
      }

      if (!payload.checkoutUrl) {
        setError(payload.error ?? "Could not start checkout.");
        return;
      }

      setCheckoutUrl(payload.checkoutUrl);
      window.location.href = payload.checkoutUrl;
    } catch {
      setError("Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-sans text-xl font-bold">Upgrade required</CardTitle>
          <CardDescription>
            Only the workspace owner can purchase licenses for {organisationName}.
            Ask them to upgrade, then you can be invited to the team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/dashboard" />} variant="outline">
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-100/80 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="size-5 text-[#F97316]" />
          <CardTitle className="font-sans text-xl font-bold text-zinc-900">
            {isAddMode ? "Add more licenses" : "Choose your team licenses"}
          </CardTitle>
        </div>
        <CardDescription>
          {isAddMode ? (
            <>
              You currently have <strong>{currentLicenses}</strong> license
              {currentLicenses === 1 ? "" : "s"} for {organisationName}. Choose
              your new total to invite more teammates.
            </>
          ) : (
            <>
              Upgrade {organisationName} after your free trial. Each license lets one
              person access your organisation&apos;s contracts and data. Invited
              teammates must use the same company email domain as you.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {isLocalDev && !isPaymentReturn ? (
          <Alert>
            <AlertDescription>
              Local testing: after payment, Stripe returns you to{" "}
              <strong>clarivo-tech.com</strong> on My Team to confirm. Open My Team
              on localhost and refresh — your licenses use the same account.
            </AlertDescription>
          </Alert>
        ) : null}

        {isPaymentReturn ? (
          <Alert>
            <AlertDescription>
              {syncing
                ? "Payment received. Activating your licenses…"
                : "Payment received. Finalising activation…"}
            </AlertDescription>
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <label htmlFor="licenses" className="text-sm font-medium text-zinc-900">
            {isAddMode ? "New license total" : "Number of licenses"}
          </label>
          <div className="mt-2 flex items-center gap-3">
            <Input
              id="licenses"
              type="number"
              min={minLicenses}
              max={100}
              value={licenses}
              onChange={(e) =>
                setLicenses(
                  Math.max(
                    minLicenses,
                    Math.min(100, Number(e.target.value) || minLicenses)
                  )
                )
              }
              className="h-11 max-w-[120px]"
              disabled={loading || syncing}
            />
            <span className="text-sm text-zinc-600">
              × £{PRICE_PER_LICENSE_GBP}/month per license
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-zinc-900">
            {totalLabel}
            <span className="text-base font-normal text-zinc-500">
              {isAddMode ? " /month (new total)" : " /month"}
            </span>
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {isAddMode ? (
              <>
                Adding {additionalLicenses} license
                {additionalLicenses === 1 ? "" : "s"} ({currentLicenses} → {licenses}).
                Your Stripe monthly subscription updates to this seat count — future
                invoices reflect the new total.
              </>
            ) : (
              <>
                Billed monthly via Stripe. Includes you as the first license.
                Unused licenses can be assigned when you invite colleagues on My Team.
              </>
            )}
          </p>
        </div>

        {!isPaymentReturn ? (
          <button
            type="button"
            disabled={loading || syncing || (isAddMode && licenses <= currentLicenses)}
            onClick={() => void handleCheckout()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#F97316] px-4 text-sm font-medium text-white transition-colors hover:bg-[#111827] disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Starting secure checkout…
              </>
            ) : (
              <>
                Continue to secure payment
                <ExternalLink className="size-4" />
              </>
            )}
          </button>
        ) : null}

        {checkoutUrl ? (
          <p className="text-center text-sm text-zinc-600">
            Not redirected?{" "}
            <a
              href={checkoutUrl}
              className="font-medium text-[#F97316] hover:underline"
            >
              Open Stripe checkout
            </a>
          </p>
        ) : null}

        {isAddMode ? (
          <Link
            href="/dashboard/team"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            Back to My Team
          </Link>
        ) : null}

        <p className="text-center text-xs text-zinc-500">
          {isAddMode
            ? "You\u2019ll pay for the additional licenses on Stripe\u2019s secure checkout page, then your seat count updates on My Team."
            : "You\u2019ll set up a monthly subscription on Stripe\u2019s secure checkout page."}
          Questions?{" "}
          <a
            href="mailto:hello@clarivo-tech.com"
            className="text-[#F97316] hover:underline"
          >
            Contact us
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
