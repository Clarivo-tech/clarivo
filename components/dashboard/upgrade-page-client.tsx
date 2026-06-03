"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
}: {
  organisationName: string;
  currentLicenses: number;
  isOwner: boolean;
  paymentSuccess?: boolean;
}) {
  const router = useRouter();
  const [licenses, setLicenses] = useState(Math.max(1, currentLicenses));
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const monthlyTotal = licenses * PRICE_PER_LICENSE_GBP;

  useEffect(() => {
    if (!paymentSuccess || !isOwner) return;

    let cancelled = false;
    let attempts = 0;

    const sync = async () => {
      if (cancelled || attempts >= 20) return;
      attempts += 1;
      setSyncing(true);
      setError(null);

      try {
        const res = await fetch("/api/billing/revolut/sync-latest", {
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
          setSuccessMessage(
            `Payment confirmed. ${payload.licenses ?? licenses} license${
              (payload.licenses ?? licenses) === 1 ? "" : "s"
            } are now active.`
          );
          router.replace("/dashboard/team");
          router.refresh();
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
  }, [paymentSuccess, isOwner, licenses, router]);

  async function handleCheckout() {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/billing/revolut/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenses }),
      });
      const payload = (await res.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!res.ok || !payload.checkoutUrl) {
        setError(payload.error ?? "Could not start checkout.");
        return;
      }

      window.location.assign(payload.checkoutUrl);
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
            Choose your team licenses
          </CardTitle>
        </div>
        <CardDescription>
          Upgrade {organisationName} after your free trial. Each license lets one
          person access your organisation&apos;s contracts and data. Invited
          teammates must use the same company email domain as you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {paymentSuccess ? (
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
            Number of licenses
          </label>
          <div className="mt-2 flex items-center gap-3">
            <Input
              id="licenses"
              type="number"
              min={1}
              max={100}
              value={licenses}
              onChange={(e) =>
                setLicenses(Math.max(1, Math.min(100, Number(e.target.value) || 1)))
              }
              className="h-11 max-w-[120px]"
              disabled={loading || syncing}
            />
            <span className="text-sm text-zinc-600">
              × £{PRICE_PER_LICENSE_GBP}/month per license
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold text-zinc-900">
            £{monthlyTotal.toLocaleString("en-GB")}
            <span className="text-base font-normal text-zinc-500"> /month</span>
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Includes you as the first license. Unused licenses can be assigned
            when you invite colleagues on My Team.
          </p>
        </div>

        <Button
          type="button"
          disabled={loading || syncing}
          onClick={() => void handleCheckout()}
          className="h-11 w-full bg-[#F97316] text-white hover:bg-[#111827]"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Starting secure checkout…
            </>
          ) : (
            <>
              Continue to secure payment
              <ExternalLink className="size-4" />
            </>
          )}
        </Button>

        <p className="text-center text-xs text-zinc-500">
          You&apos;ll complete payment on your secure Revolut checkout page.
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
