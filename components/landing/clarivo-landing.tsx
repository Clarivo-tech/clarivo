"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BookDemoModal } from "@/components/landing/book-demo-modal";
import { cn } from "@/lib/utils";

/** Clean modern display type for hero & brand (system stack). */
const displayFont =
  "font-semibold tracking-[-0.02em] [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Segoe_UI',system-ui,sans-serif]";

const FEATURES = [
  {
    icon: "⚡",
    title: "AI Extraction",
    description:
      "Upload PDFs and get vendor, value, dates, notice periods, and renewal terms extracted in under 30 seconds.",
  },
  {
    icon: "📊",
    title: "Live Dashboard",
    description:
      "Portfolio value, renewals, and contract health in one command centre — always up to date.",
  },
  {
    icon: "🔔",
    title: "Renewal Alerts",
    description:
      "Never miss a notice deadline. See what's expiring, what's auto-renewing, and what needs action.",
  },
  {
    icon: "💬",
    title: "Contract AI Chat",
    description:
      "Ask natural-language questions across your entire portfolio — grounded only in your contract data.",
  },
  {
    icon: "📈",
    title: "Spend Analytics",
    description:
      "Vendor spend, portfolio growth, lifecycle timelines, and risk registers in a dedicated analytics view.",
  },
  {
    icon: "🛡️",
    title: "Health Scores",
    description:
      "Every contract scored for renewal risk, exit clauses, notice periods, and auto-renewal exposure.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Upload",
    description:
      "Drop your contracts into Clarivo. We support PDFs and process them securely in the cloud.",
  },
  {
    num: "02",
    title: "Extract",
    description:
      "AI reads every clause — values, dates, vendors, notice periods, and renewal terms — automatically.",
  },
  {
    num: "03",
    title: "Monitor",
    description:
      "Track renewals, chat with your data, and spot risk before deadlines pass you by.",
  },
];

const PLANS = [
  {
    name: "Enterprise",
    price: "£99",
    period: "/mo",
    description: "One plan with everything Clarivo offers.",
    features: [
      "Unlimited contracts",
      "AI extraction",
      "Live dashboard",
      "Renewal alerts",
      "Contract AI chat",
      "Spend analytics",
      "Health scores",
      "Custom reminders & alerts",
      "Priority support",
      "Multi-currency support",
      "Everything included",
    ],
    cta: "Start free trial",
    href: "/signup",
    highlighted: true,
  },
];

const STATS = [
  { value: "£2.3M", label: "avg spend tracked" },
  { value: "94%", label: "renewals caught" },
  { value: "<30s", label: "extraction time" },
  { value: "4.9★", label: "customer rating" },
];

function MockDashboard() {
  const rows = [
    { vendor: "Acme SaaS Ltd", value: "£48,000", renewal: "Mar 2026", health: 7 },
    { vendor: "CloudHost Inc", value: "£12,400", renewal: "Jun 2026", health: 9 },
    { vendor: "DataSync Pro", value: "£86,200", renewal: "Apr 2026", health: 4 },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      <div className="flex border-b border-zinc-100">
        <div className="hidden w-44 shrink-0 border-r border-white/[0.08] bg-[#111827] p-4 sm:block">
          <div className="flex items-center gap-2">
            <div className="size-7 overflow-hidden rounded-lg">
              <Image
                src="/clarivo-logo.png"
                alt=""
                width={28}
                height={28}
                className="size-7 object-cover"
              />
            </div>
            <span className="text-xs font-semibold text-white">Clarivo</span>
          </div>
          <nav className="mt-6 space-y-1 text-[11px]">
            <div className="rounded-lg bg-[#F97316] px-2.5 py-1.5 font-medium text-white">
              Dashboard
            </div>
            <div className="px-2.5 py-1.5 text-zinc-500">Analytics</div>
            <div className="px-2.5 py-1.5 text-zinc-500">Contracts</div>
          </nav>
        </div>
        <div className="min-w-0 flex-1 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-500">Dashboard</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Trial active
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Total Contracts", val: "12" },
              { label: "Total Value", val: "£284k" },
              { label: "Renewals (12mo)", val: "4" },
              { label: "Alerts", val: "9" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-zinc-200 bg-white p-2.5"
              >
                <p className="text-[9px] text-zinc-500">{s.label}</p>
                <p className="mt-0.5 text-sm font-bold text-zinc-900">{s.val}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1.5fr_1fr]">
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="grid grid-cols-4 gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                <span className="col-span-2">Vendor</span>
                <span>Value</span>
                <span>Health</span>
              </div>
              {rows.map((row) => (
                <div
                  key={row.vendor}
                  className="grid grid-cols-4 items-center gap-2 border-b border-zinc-50 px-3 py-2 text-[10px] last:border-0"
                >
                  <span className="col-span-2 truncate font-medium text-zinc-900">
                    {row.vendor}
                  </span>
                  <span className="text-zinc-600">{row.value}</span>
                  <span
                    className={cn(
                      "inline-flex w-fit rounded px-1.5 py-0.5 text-[9px] font-semibold",
                      row.health >= 8
                        ? "bg-emerald-50 text-emerald-700"
                        : row.health >= 5
                          ? "bg-orange-50 text-[#EA580C]"
                          : "bg-red-50 text-red-700"
                    )}
                  >
                    {row.health}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                <p className="text-[9px] uppercase tracking-wide text-zinc-500">
                  Renewal Alerts
                </p>
                <div className="mt-2 space-y-1.5 text-[10px]">
                  <p className="rounded bg-red-50 px-2 py-1 text-red-700">
                    DataSync Pro — 14d
                  </p>
                  <p className="rounded bg-orange-50 px-2 py-1 text-[#C2410C]">
                    Acme SaaS — 43d
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                <p className="text-[9px] uppercase tracking-wide text-zinc-500">
                  AI Chat
                </p>
                <p className="mt-2 rounded bg-zinc-50 px-2 py-1.5 text-[10px] text-zinc-600">
                  &quot;Which renewals are in the next 60 days?&quot;
                </p>
              </div>
            </div>
          </div>

          <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="grid grid-cols-4 gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-[9px] font-medium uppercase tracking-wide text-zinc-500">
              <span className="col-span-2">Spend by Vendor</span>
              <span className="col-span-2">Trend</span>
            </div>
            <div className="grid grid-cols-4 items-center gap-2 px-3 py-2 text-[10px]">
              <span className="col-span-2 font-medium text-zinc-800">Top suppliers</span>
              <div className="col-span-2 h-2 rounded-full bg-gradient-to-r from-[#F97316] via-[#38BDF8] to-[#A855F7]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClarivoLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  const openDemo = useCallback(() => setDemoOpen(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#ffffff] via-[#fff2e6] to-[#ffdfc2] text-[#111111]">
      <div
        className="pointer-events-none fixed inset-0 opacity-100"
        style={{
          background:
            "radial-gradient(1200px 700px at 12% 0%, rgba(255,255,255,0.7), transparent 55%), radial-gradient(900px 560px at 88% 12%, rgba(249,115,22,0.2), transparent 60%), radial-gradient(900px 560px at 50% 100%, rgba(249,115,22,0.14), transparent 65%)",
        }}
        aria-hidden
      />

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-[#e5e5e5] bg-white/85 backdrop-blur-xl"
            : "bg-transparent"
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            aria-label="Clarivo home"
          >
            <Image
              src="/clarivo-logo.png"
              alt=""
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
            <span className={cn(displayFont, "text-lg text-[#111111]")}>
              Clarivo
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#666666] md:flex">
            <a href="#features" className="transition-colors hover:text-[#111111]">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-[#111111]">
              How it Works
            </a>
            <a href="#pricing" className="transition-colors hover:text-[#111111]">
              Pricing
            </a>
            <a href="#demo" className="transition-colors hover:text-[#111111]">
              Demo
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-[#F97316] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C] sm:px-4"
            >
              Log in
            </Link>
            <button
              type="button"
              onClick={openDemo}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-100 sm:px-4"
            >
              Demo with a human
            </button>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Hero */}
        <section className="px-4 pb-20 pt-28 sm:px-6 sm:pb-28 sm:pt-36">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl text-left">
              <p className="inline-flex rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F97316]">
                AI-Powered Contract Intelligence
              </p>
              <h1
                className={cn(
                  displayFont,
                  "mt-6 text-4xl font-extrabold leading-[1.02] text-[#111111] sm:text-6xl lg:text-7xl"
                )}
                style={{
                  textShadow:
                    "0 1px 0 rgba(255,255,255,0.9), 0 8px 24px rgba(17,24,39,0.18), 0 2px 4px rgba(17,24,39,0.12)",
                }}
              >
                Centralised Contract Intelligence
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#555555] sm:text-lg">
                Upload your contracts. Clarivo&apos;s AI extracts the critical
                data and keeps your entire portfolio visible, so you never miss
                a thing!
              </p>
              <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="w-full rounded-lg bg-[#F97316] px-6 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#EA580C] sm:w-auto"
                >
                  Start free trial
                </Link>
                <button
                  type="button"
                  onClick={openDemo}
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-3.5 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-100 sm:w-auto"
                >
                  Demo with a human
                </button>
              </div>
            </div>
            <div className="mx-auto mt-14 max-w-4xl sm:mt-20">
              <MockDashboard />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-[#e5e5e5] bg-white">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-[#e5e5e5] md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="px-6 py-10 text-center">
                <p
                  className={cn(
                    displayFont,
                    "text-3xl font-bold text-[#111111] sm:text-4xl"
                  )}
                >
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-medium text-[#555555]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <h2
                className={cn(
                  displayFont,
                  "text-3xl font-bold text-[#111111] sm:text-4xl"
                )}
              >
                Everything you need to own your contract portfolio
              </h2>
              <p className="mt-4 text-[#555555]">
                From extraction to analytics — built for finance, legal, and
                operations teams who can&apos;t afford a missed renewal.
              </p>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article
                  key={feature.title}
                  className="group rounded-xl border border-[#e5e5e5] bg-[#f9f9f9] p-6 transition-all hover:border-[#F97316] hover:bg-white hover:shadow-[0_8px_30px_rgba(249,115,22,0.08)]"
                >
                  <span className="text-2xl" aria-hidden>
                    {feature.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-[#333333]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#555555]">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-t border-[#e5e5e5] bg-[#f5f5f5] px-4 py-24 sm:px-6 sm:py-32"
        >
          <div className="mx-auto max-w-6xl">
            <h2
              className={cn(
                displayFont,
                "text-center text-3xl font-bold text-[#111111] sm:text-4xl"
              )}
            >
              How it works
            </h2>
            <div className="relative mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
              <div
                className="absolute left-[16.67%] right-[16.67%] top-8 hidden h-px bg-gradient-to-r from-transparent via-[#F97316]/50 to-transparent md:block"
                aria-hidden
              />
              {STEPS.map((step) => (
                <div key={step.num} className="relative text-center md:text-left">
                  <p
                    className={cn(
                      displayFont,
                      "text-5xl font-bold text-[#F97316] sm:text-6xl"
                    )}
                  >
                    {step.num}
                  </p>
                  <h3 className="mt-4 text-xl font-semibold text-[#333333]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#555555]">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2
                className={cn(
                  displayFont,
                  "text-3xl font-bold text-[#111111] sm:text-4xl"
                )}
              >
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-[#555555]">
                Start free. Scale when your portfolio grows.
              </p>
            </div>
            <div className="mx-auto mt-14 grid max-w-xl gap-6">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={cn(
                    "flex flex-col rounded-xl border p-6 sm:p-8",
                    plan.highlighted
                      ? "border-[#F97316] bg-[#F97316]/5 shadow-[0_0_40px_rgba(249,115,22,0.12)]"
                      : "border-[#e5e5e5] bg-[#f9f9f9]"
                  )}
                >
                  {plan.highlighted ? (
                    <span className="mb-4 inline-flex w-fit rounded-full bg-[#F97316] px-3 py-0.5 text-xs font-semibold text-white">
                      Most popular
                    </span>
                  ) : null}
                  <h3 className="text-lg font-semibold text-[#333333]">
                    {plan.name}
                  </h3>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span
                      className={cn(
                        displayFont,
                        "text-4xl font-bold text-[#111111]"
                      )}
                    >
                      {plan.price}
                    </span>
                    {plan.period ? (
                      <span className="text-[#555555]">{plan.period}</span>
                    ) : null}
                  </p>
                  <p className="mt-3 text-sm text-[#555555]">{plan.description}</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-[#555555]"
                      >
                        <span className="mt-0.5 text-[#F97316]" aria-hidden>
                          ✓
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {plan.href ? (
                    <Link
                      href={plan.href}
                      className={cn(
                        "mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition-colors",
                        plan.highlighted
                          ? "bg-[#F97316] text-white hover:bg-[#EA580C]"
                          : "border border-[#e5e5e5] text-[#111111] hover:border-[#cccccc]"
                      )}
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={openDemo}
                      className="mt-8 rounded-lg border border-[#e5e5e5] py-3 text-sm font-semibold text-[#111111] transition-colors hover:border-[#cccccc]"
                    >
                      {plan.cta}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Demo anchor + Final CTA */}
        <section
          id="demo"
          className="border-t border-[#e5e5e5] bg-[#f5f5f5] px-4 py-24 sm:px-6 sm:py-32"
        >
          <div className="mx-auto max-w-3xl text-center">
            <h2
              className={cn(
                displayFont,
                "text-3xl font-bold text-[#111111] sm:text-5xl"
              )}
            >
              Stop chasing contracts in inboxes and spreadsheets
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[#555555]">
              Join teams who use Clarivo to extract, monitor, and protect every
              pound committed across their vendor portfolio.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-lg bg-[#F97316] px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#EA580C] sm:w-auto"
              >
                Start free trial
              </Link>
              <button
                type="button"
                onClick={openDemo}
                className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-8 py-3.5 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-100 sm:w-auto"
              >
                Demo with a human
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e5e5e5] bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[#555555] sm:flex-row">
          <Link href="/" className="flex items-center gap-2" aria-label="Clarivo home">
            <Image
              src="/clarivo-logo.png"
              alt=""
              width={24}
              height={24}
              className="rounded-md"
            />
            <span className={cn(displayFont, "text-[#111111]")}>Clarivo</span>
          </Link>
          <p className="text-center text-xs sm:text-sm">
            © {new Date().getFullYear()} Clarivo. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-[#666666] sm:text-sm">
            <a href="#" className="transition-colors hover:text-[#111111]">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-[#111111]">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-[#111111]">
              Contact
            </a>
          </div>
        </div>
      </footer>

      <BookDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
