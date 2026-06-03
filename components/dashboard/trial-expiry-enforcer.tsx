"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

type TrialExpiryEnforcerProps = {
  trialExpiresAt: string | null;
  isTrial: boolean;
};

export function TrialExpiryEnforcer({
  trialExpiresAt,
  isTrial,
}: TrialExpiryEnforcerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!isTrial || !trialExpiresAt) return;

    let cancelled = false;
    const expiresAtMs = new Date(trialExpiresAt).getTime();
    if (Number.isNaN(expiresAtMs)) return;

    const enforce = async () => {
      if (cancelled) return;
      if (Date.now() < expiresAtMs) return;
      if (pathname === "/dashboard/upgrade") return;
      if (!cancelled) {
        window.location.assign("/dashboard/upgrade");
      }
    };

    // Run immediately and then poll while the tab remains open.
    void enforce();
    const interval = window.setInterval(() => {
      void enforce();
    }, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isTrial, trialExpiresAt, pathname]);

  return null;
}
