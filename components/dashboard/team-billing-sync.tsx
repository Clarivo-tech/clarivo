"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function TeamBillingSync({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const billingReturn =
    searchParams.get("billing") === "success" ||
    searchParams.get("payment") === "success";
  const [syncing, setSyncing] = useState(billingReturn);
  const [message, setMessage] = useState<string | null>(
    billingReturn ? "Confirming your payment and updating licenses…" : null
  );

  useEffect(() => {
    if (!isOwner) return;

    let cancelled = false;

    const run = async () => {
      setSyncing(true);
      try {
        const res = await fetch("/api/billing/stripe/sync-latest", {
          method: "POST",
          credentials: "same-origin",
        });
        const payload = (await res.json()) as {
          status?: string;
          licenses?: number;
          error?: string;
        };

        if (cancelled) return;

        if (!res.ok) {
          setMessage(payload.error ?? "Could not confirm payment yet.");
          return;
        }

        if (payload.status === "completed") {
          setMessage(
            payload.licenses
              ? `Payment confirmed. You now have ${payload.licenses} license${payload.licenses === 1 ? "" : "s"}.`
              : "Payment confirmed. Your licenses are updated."
          );
          router.refresh();
          if (billingReturn) {
            router.replace("/dashboard/team");
          }
          return;
        }

        if (billingReturn) {
          setMessage("Payment received. Still confirming — refresh in a moment.");
        } else {
          setMessage(null);
        }
      } catch {
        if (!cancelled && billingReturn) {
          setMessage("Could not confirm payment yet. Please refresh the page.");
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [isOwner, billingReturn, router]);

  if (!message) return null;

  return (
    <Alert>
      <AlertDescription className="flex items-center gap-2">
        {syncing ? <Loader2 className="size-4 shrink-0 animate-spin" /> : null}
        {message}
      </AlertDescription>
    </Alert>
  );
}
