"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function InviteAcceptClient({
  token,
  mode,
  email,
}: {
  token: string;
  mode: "accept" | "signup";
  email?: string;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const body =
        mode === "signup"
          ? { token, firstName, lastName, password }
          : { token };

      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Could not accept invitation.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {mode === "signup" && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">Email</label>
            <Input type="email" value={email ?? ""} disabled readOnly />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">
                First name
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">
                Last name
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={pending}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              disabled={pending}
            />
          </div>
        </>
      )}

      <Button
        type="button"
        disabled={pending}
        className="w-full bg-[#F97316] text-white hover:bg-[#EA580C]"
        onClick={submit}
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            Accepting…
          </>
        ) : mode === "signup" ? (
          "Create account & accept"
        ) : (
          "Accept invitation"
        )}
      </Button>
    </div>
  );
}
