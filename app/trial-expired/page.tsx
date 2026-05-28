"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LOST_ACCESS_ITEMS = [
  "Live dashboard and renewal tracking",
  "AI-powered contract extraction",
  "Portfolio analytics and risk register",
  "Contract AI chat and proactive alerts",
];

export default function TrialExpiredPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#111827] px-4 py-12 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center">
        <div className="mb-8 flex items-center gap-3">
          <Image
            src="/clarivo-logo.png"
            alt="Clarivo"
            width={36}
            height={36}
            className="rounded-lg"
          />
          <span className="text-2xl font-semibold tracking-tight">Clarivo</span>
        </div>

        <section className="w-full rounded-2xl border border-white/10 bg-black/20 p-8 shadow-2xl shadow-black/40">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Your free trial has ended
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            You&apos;ve had a taste of centralised contract intelligence. Upgrade
            to Pro to keep full access.
          </p>

          <div className="mt-6 rounded-xl border border-orange-400/30 bg-[#F97316]/10 p-4">
            <h2 className="text-sm font-semibold text-[#FDBA74]">
              Without upgrading, you&apos;ll lose access to:
            </h2>
            <ul className="mt-3 space-y-2">
              {LOST_ACCESS_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-zinc-200">
                  <span className="mt-0.5 text-[#F97316]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/api/checkout"
            className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-[#F97316] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C]"
          >
            Upgrade to Pro — £99/month
          </Link>

          <div className="mt-5 flex items-center justify-between text-sm">
            <a
              href="mailto:bill@clarivo-tech.com"
              className="text-zinc-300 underline underline-offset-2 hover:text-white"
            >
              Contact us
            </a>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="text-zinc-300 underline underline-offset-2 hover:text-white disabled:opacity-60"
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
