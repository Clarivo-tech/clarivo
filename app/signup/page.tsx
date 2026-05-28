"use client";

import { useState } from "react";
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

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          company: company.trim(),
          job_title: jobTitle.trim(),
          contact_number: contactNumber.trim(),
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setError("Signup succeeded, but no user was returned.");
      setLoading(false);
      return;
    }

    const now = new Date();
    const trialExpiresAt = new Date(now);
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 5);

    const { error: prefError } = await supabase.from("user_preferences").upsert(
      {
        user_id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company: company.trim(),
        job_title: jobTitle.trim(),
        contact_number: contactNumber.trim(),
        trial_started_at: now.toISOString(),
        trial_expires_at: trialExpiresAt.toISOString(),
        subscription_status: "trial",
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (prefError) {
      setError(prefError.message);
      setLoading(false);
      return;
    }

    try {
      const emailResponse = await fetch("/api/email/signup-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          company: company.trim(),
          jobTitle: jobTitle.trim(),
          trialExpiresAt: trialExpiresAt.toISOString(),
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

    router.push("/dashboard");
    router.refresh();
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
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Start your 5-day free trial.
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
                <label
                  htmlFor="firstName"
                  className="text-sm font-medium text-zinc-700"
                >
                  First name
                </label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="lastName"
                  className="text-sm font-medium text-zinc-700"
                >
                  Last name
                </label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Smith"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
                />
              </div>
            </div>

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
                htmlFor="company"
                className="text-sm font-medium text-zinc-700"
              >
                Company
              </label>
              <Input
                id="company"
                type="text"
                placeholder="Acme Ltd"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                disabled={loading}
                className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="jobTitle"
                className="text-sm font-medium text-zinc-700"
              >
                Job title
              </label>
              <Input
                id="jobTitle"
                type="text"
                placeholder="Head of Procurement"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required
                disabled={loading}
                className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="contactNumber"
                className="text-sm font-medium text-zinc-700"
              >
                Contact number
              </label>
              <Input
                id="contactNumber"
                type="tel"
                placeholder="+44 7123 456789"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                required
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
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                disabled={loading}
                className="h-10 focus-visible:border-[#F97316] focus-visible:ring-[#F97316]/30"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-1 h-10 w-full bg-[#F97316] text-white hover:bg-[#EA580C]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Starting trial…
                </>
              ) : (
                "Start free trial"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-[#F97316] hover:text-[#EA580C] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
