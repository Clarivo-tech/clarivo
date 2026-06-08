"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import { CHECKOUT_UPGRADE_PAGE_PATH } from "@/lib/billing/payment-link";
import { TRIAL_EXPIRED_MESSAGE } from "@/lib/trial/constants";

function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-700">
      {children}
      <span className="text-[#F97316]" aria-hidden>
        {" "}
        *
      </span>
    </label>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [paidIntent, setPaidIntent] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const intent = new URLSearchParams(window.location.search).get("intent");
    setPaidIntent(intent !== "trial");
  }, []);

  const trimmed = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    company: company.trim(),
    jobTitle: jobTitle.trim(),
    contactNumber: contactNumber.trim(),
    password,
  };

  const isFormComplete =
    trimmed.firstName.length > 0 &&
    trimmed.lastName.length > 0 &&
    trimmed.email.length > 0 &&
    trimmed.company.length > 0 &&
    trimmed.jobTitle.length > 0 &&
    trimmed.contactNumber.length > 0 &&
    trimmed.password.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!trimmed.firstName || !trimmed.lastName) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!trimmed.email) {
      setError("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!trimmed.company) {
      setError("Please enter your company name.");
      return;
    }
    if (!trimmed.jobTitle) {
      setError("Please enter your job title.");
      return;
    }
    if (!trimmed.contactNumber) {
      setError("Please enter your contact number.");
      return;
    }
    if (trimmed.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const isPaidSignup =
      new URLSearchParams(window.location.search).get("intent") !== "trial";

    if (!isPaidSignup) {
      try {
        const eligibilityRes = await fetch("/api/auth/trial-eligibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed.email }),
        });
        const eligibility = (await eligibilityRes.json()) as {
          eligible?: boolean;
          message?: string;
        };
        if (!eligibility.eligible) {
          setError(eligibility.message ?? TRIAL_EXPIRED_MESSAGE);
          setLoading(false);
          return;
        }
      } catch {
        setError("Could not verify signup eligibility. Please try again.");
        setLoading(false);
        return;
      }
    }

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email: trimmed.email,
      password: trimmed.password,
      options: {
        data: {
          first_name: trimmed.firstName,
          last_name: trimmed.lastName,
          company: trimmed.company,
          job_title: trimmed.jobTitle,
          contact_number: trimmed.contactNumber,
        },
      },
    });

    if (authError) {
      const alreadyRegistered =
        authError.message.toLowerCase().includes("already") ||
        authError.message.toLowerCase().includes("registered");

      if (alreadyRegistered) {
        try {
          const eligibilityRes = await fetch("/api/auth/trial-eligibility", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: trimmed.email }),
          });
          const eligibility = (await eligibilityRes.json()) as {
            eligible?: boolean;
            message?: string;
          };
          if (!eligibility.eligible) {
            setError(eligibility.message ?? TRIAL_EXPIRED_MESSAGE);
            setLoading(false);
            return;
          }
        } catch {
          // fall through to generic message
        }
        if (isPaidSignup) {
          const encodedEmail = encodeURIComponent(trimmed.email);
          const redirect = encodeURIComponent(CHECKOUT_UPGRADE_PAGE_PATH);
          window.location.assign(
            `/login?redirect=${redirect}&email=${encodedEmail}`
          );
          return;
        }
        setError("An account with this email already exists. Please sign in.");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setError("Signup succeeded, but no user was returned.");
      setLoading(false);
      return;
    }

    const hasSession = Boolean(data.session);

    const trialExpiresAt = new Date();
    trialExpiresAt.setMinutes(trialExpiresAt.getMinutes() + 5);

    try {
      const finalizeRes = await fetch("/api/auth/finalize-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email: trimmed.email,
          firstName: trimmed.firstName,
          lastName: trimmed.lastName,
          company: trimmed.company,
          jobTitle: trimmed.jobTitle,
          contactNumber: trimmed.contactNumber,
          paidSignup: isPaidSignup,
        }),
      });

      if (!finalizeRes.ok) {
        const payload = (await finalizeRes.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          payload.error ??
            "Account created but setup failed. Please sign in and try again."
        );
        setLoading(false);
        return;
      }
    } catch {
      setError("Account created but setup failed. Please sign in and try again.");
      setLoading(false);
      return;
    }

    try {
      const emailResponse = await fetch("/api/email/signup-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmed.firstName,
          lastName: trimmed.lastName,
          email: trimmed.email,
          company: trimmed.company,
          jobTitle: trimmed.jobTitle,
          trialExpiresAt: isPaidSignup ? null : trialExpiresAt.toISOString(),
        }),
      });

      if (!emailResponse.ok) {
        const payload = (await emailResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        console.error(
          "[signup] welcome/founder email failed:",
          emailResponse.status,
          payload.error ?? emailResponse.statusText
        );
      }
    } catch (emailError) {
      console.error("[signup] welcome/founder email failed:", emailError);
    }

    if (isPaidSignup) {
      const destination = CHECKOUT_UPGRADE_PAGE_PATH;
      if (hasSession) {
        window.location.assign(destination);
        return;
      }
      window.location.assign(
        `/login?redirect=${encodeURIComponent(destination)}`
      );
      return;
    }

    if (!hasSession) {
      setLoading(false);
      window.location.assign("/login");
      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <div className="relative min-h-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50/40 px-4 py-12">
      <Link
        href="/"
        className="absolute left-6 top-6 flex items-center gap-2.5"
        aria-label="Back to Clarivo homepage"
      >
        <Image
          src="/clarivo-logo.png"
          alt=""
          width={32}
          height={32}
          className="rounded-lg"
        />
        <span className="text-lg font-semibold tracking-tight text-zinc-900">
          Clarivo
        </span>
      </Link>

      <Card className="w-full max-w-md border-orange-100/80 shadow-xl shadow-orange-500/5">
        <CardHeader>
          <CardTitle className="font-sans text-xl font-bold tracking-tight text-zinc-900">
            Create your account
          </CardTitle>
          <CardDescription>
            {paidIntent
              ? "Create your account and continue to secure payment."
              : "Start your 5-minute free trial."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <RequiredLabel htmlFor="firstName">First name</RequiredLabel>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  minLength={1}
                  aria-required="true"
                  disabled={loading}
                  className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <RequiredLabel htmlFor="lastName">Last name</RequiredLabel>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Smith"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  minLength={1}
                  aria-required="true"
                  disabled={loading}
                  className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <RequiredLabel htmlFor="email">Email</RequiredLabel>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                minLength={1}
                aria-required="true"
                autoComplete="email"
                disabled={loading}
                className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <RequiredLabel htmlFor="company">Company</RequiredLabel>
              <Input
                id="company"
                type="text"
                placeholder="Acme Ltd"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                minLength={1}
                aria-required="true"
                disabled={loading}
                className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <RequiredLabel htmlFor="jobTitle">Job title</RequiredLabel>
              <Input
                id="jobTitle"
                type="text"
                placeholder="Head of Procurement"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required
                minLength={1}
                aria-required="true"
                disabled={loading}
                className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <RequiredLabel htmlFor="contactNumber">Contact number</RequiredLabel>
              <Input
                id="contactNumber"
                type="tel"
                placeholder="+44 7123 456789"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                required
                minLength={1}
                aria-required="true"
                disabled={loading}
                className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <RequiredLabel htmlFor="password">Password</RequiredLabel>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                aria-required="true"
                autoComplete="new-password"
                disabled={loading}
                className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
              />
            </div>

            <p className="text-xs text-zinc-500">
              <span className="text-[#F97316]">*</span> All fields are required
            </p>

            <Button
              type="submit"
              disabled={loading || !isFormComplete}
              className="mt-1 h-10 w-full bg-[#F97316] text-white hover:bg-[#111827] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  {paidIntent ? "Creating account…" : "Starting trial…"}
                </>
              ) : (
                paidIntent ? "Create account & continue to payment" : "Start free trial"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href={paidIntent ? "/login?redirect=/dashboard/upgrade" : "/login"}
              className="font-medium text-[#F97316] hover:text-[#111827] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
