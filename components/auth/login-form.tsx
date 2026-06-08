"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
import { isAccountLocked } from "@/lib/trial/access";
import { TRIAL_EXPIRED_MESSAGE } from "@/lib/trial/constants";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const trialExpiredParam = searchParams.get("trial_expired");
  const emailParam = searchParams.get("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const safeRedirect =
      redirectTo && redirectTo.startsWith("/") ? redirectTo : null;

    if (
      safeRedirect?.includes("payment=success") ||
      safeRedirect?.includes("billing=success")
    ) {
      try {
        await fetch("/api/billing/stripe/sync-latest", { method: "POST" });
      } catch {
        // Upgrade page also syncs server-side.
      }
    }

    if (user?.id) {
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("trial_expires_at, subscription_status, trial_started_at, trial_used")
        .eq("user_id", user.id)
        .maybeSingle();

      const locked =
        prefs &&
        isAccountLocked({
          subscription_status: prefs.subscription_status,
          trial_expires_at: prefs.trial_expires_at,
          trial_started_at: prefs.trial_started_at,
          trial_used: prefs.trial_used,
        });

      if (locked) {
        window.location.assign(safeRedirect ?? "/dashboard/upgrade");
        return;
      }
    }

    const destination = safeRedirect ?? "/dashboard";
    router.push(destination);
    router.refresh();
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50/40 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <img
          src="/clarivo-logo.png"
          alt="Clarivo"
          width={36}
          height={36}
          style={{ borderRadius: "8px" }}
        />
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Clarivo
          </h1>
          <p className="text-sm text-zinc-500">Contract intelligence</p>
        </div>
      </div>

      <Card className="w-full max-w-md border-orange-100/80 shadow-xl shadow-orange-500/5">
        <CardHeader>
          <CardTitle className="font-sans text-xl font-bold tracking-tight text-zinc-900">
            Welcome back
          </CardTitle>
          <CardDescription>
            Sign in to your account to manage contracts and spend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {trialExpiredParam === "1" && !error && (
              <Alert variant="destructive">
                <AlertDescription>{TRIAL_EXPIRED_MESSAGE}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
                className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-zinc-700"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-10 w-full bg-[#F97316] text-white hover:bg-[#111827]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Need full access after your trial?{" "}
            <Link
              href="/login?redirect=/dashboard/upgrade"
              className="font-medium text-[#F97316] hover:text-[#111827] hover:underline"
            >
              Sign in to upgrade
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-zinc-500">
            New to Clarivo?{" "}
            <Link
              href="/signup"
              className="font-medium text-[#F97316] hover:text-[#111827] hover:underline"
            >
              Start free trial
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
