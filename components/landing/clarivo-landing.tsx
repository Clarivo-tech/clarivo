"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart2,
  Bell,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { BookDemoModal } from "@/components/landing/book-demo-modal";
import { ContactSection } from "@/components/landing/contact-section";
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

const MOCK_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Documents", icon: FileText, active: false },
  { label: "Analytics", icon: BarChart2, active: false },
  { label: "My Team", icon: Users, active: false },
  { label: "Alerts", icon: Bell, active: false },
  { label: "Settings", icon: Settings, active: false },
] as const;

const PORTFOLIO_POINTS = [42, 48, 45, 58, 62, 71, 68, 78, 85, 92];
const CONTRACT_TYPES = [
  { label: "SaaS", pct: 72, color: "#F97316" },
  { label: "Services", pct: 48, color: "#38BDF8" },
  { label: "Lease", pct: 35, color: "#A855F7" },
  { label: "Other", pct: 22, color: "#10B981" },
];

function MockLineChart() {
  const w = 200;
  const h = 56;
  const max = Math.max(...PORTFOLIO_POINTS);
  const min = Math.min(...PORTFOLIO_POINTS);
  const range = max - min || 1;
  const coords = PORTFOLIO_POINTS.map((v, i) => {
    const x = (i / (PORTFOLIO_POINTS.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" aria-hidden>
      <defs>
        <linearGradient id="mockLineFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${coords} ${w},${h}`}
        fill="url(#mockLineFill)"
      />
      <polyline
        points={coords}
        fill="none"
        stroke="#F97316"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MockDashboard() {
  const rows = [
    { vendor: "Acme SaaS Ltd", value: "£48k", health: 7 },
    { vendor: "CloudHost Inc", value: "£12k", health: 9 },
    { vendor: "DataSync Pro", value: "£86k", health: 4 },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      <div className="flex min-h-[320px]">
        <div className="hidden w-[148px] shrink-0 border-r border-white/[0.08] bg-[#111827] px-2.5 py-3 sm:block">
          <div className="flex items-center gap-2 px-1">
            <Image
              src="/clarivo-logo.png"
              alt=""
              width={24}
              height={24}
              className="size-6 rounded-md"
            />
            <span className="text-[11px] font-semibold text-white">Clarivo</span>
          </div>
          <nav className="mt-4 space-y-0.5">
            {MOCK_NAV.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-medium",
                  item.active
                    ? "bg-[#F97316] text-white shadow-sm shadow-orange-500/30"
                    : "text-zinc-500"
                )}
              >
                <item.icon className="size-3.5 shrink-0" strokeWidth={2} />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </nav>
        </div>

        <div className="min-w-0 flex-1 bg-zinc-50/80 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-zinc-800">Dashboard</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Trial active
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {[
              { label: "Contracts", val: "12" },
              { label: "Portfolio", val: "£284k" },
              { label: "Renewals", val: "4" },
              { label: "Alerts", val: "9" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-2"
              >
                <p className="text-[8px] text-zinc-500">{s.label}</p>
                <p className="text-sm font-bold text-zinc-900">{s.val}</p>
              </div>
            ))}
          </div>

          <div className="mt-2.5 grid gap-2 lg:grid-cols-[1fr_0.85fr]">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                  Portfolio growth
                </p>
                <MockLineChart />
                <div className="mt-1 flex justify-between text-[8px] text-zinc-400">
                  <span>Jan</span>
                  <span>+18% YoY</span>
                  <span>Dec</span>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                  Contracts by type
                </p>
                <div className="mt-2 space-y-1.5">
                  {CONTRACT_TYPES.map((t) => (
                    <div key={t.label} className="flex items-center gap-2">
                      <span className="w-10 shrink-0 text-[8px] text-zinc-600">
                        {t.label}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${t.pct}%`,
                            backgroundColor: t.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-2.5 sm:col-span-2">
                <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                  Vendor health
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {rows.map((row) => (
                    <div
                      key={row.vendor}
                      className="rounded-md border border-zinc-100 bg-zinc-50/80 px-2 py-1.5"
                    >
                      <p className="truncate text-[9px] font-medium text-zinc-900">
                        {row.vendor}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[8px] text-zinc-500">{row.value}</span>
                        <span
                          className={cn(
                            "rounded px-1 text-[8px] font-bold",
                            row.health >= 8
                              ? "bg-emerald-100 text-emerald-700"
                              : row.health >= 5
                                ? "bg-orange-100 text-[#C2410C]"
                                : "bg-red-100 text-red-700"
                          )}
                        >
                          {row.health}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-[#111827] shadow-inner">
                <div className="flex items-center gap-2 border-b border-white/[0.08] px-2.5 py-2">
                  <Sparkles className="size-3.5 text-[#F97316]" />
                  <span className="text-[10px] font-semibold text-white">
                    Contract AI
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-2.5">
                  <div className="rounded-lg rounded-bl-sm bg-white/95 px-2 py-1.5 text-[9px] leading-snug text-[#111827]">
                    Ask anything about your portfolio — renewals, spend, notice
                    periods, and risk.
                  </div>
                  <div className="ml-auto max-w-[92%] rounded-lg rounded-br-sm bg-[#F97316] px-2 py-1.5 text-[9px] text-white">
                    Which contracts renew in the next 60 days?
                  </div>
                  <div className="rounded-lg rounded-bl-sm bg-white/95 px-2 py-1.5 text-[9px] leading-snug text-[#111827]">
                    <span className="font-medium text-[#F97316]">3 renewals</span>{" "}
                    due: DataSync Pro (14d), Acme SaaS (43d), CloudHost (58d).
                    Total exposure £146k.
                  </div>
                </div>
                <div className="border-t border-white/[0.08] p-2">
                  <div className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-[#0f172a] px-2 py-1.5">
                    <MessageSquare className="size-3 shrink-0 text-zinc-500" />
                    <span className="flex-1 truncate text-[8px] text-zinc-500">
                      Ask about your contracts…
                    </span>
                    <span className="rounded bg-[#F97316] px-1.5 py-0.5 text-[8px] font-semibold text-white">
                      Send
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                  Renewal alerts
                </p>
                <div className="mt-1.5 space-y-1 text-[9px]">
                  <p className="rounded-md bg-red-50 px-2 py-1 font-medium text-red-700">
                    DataSync Pro — notice in 14 days
                  </p>
                  <p className="rounded-md bg-orange-50 px-2 py-1 font-medium text-[#C2410C]">
                    Acme SaaS — renewal in 43 days
                  </p>
                </div>
              </div>
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
                  "mt-6 text-4xl font-semibold leading-[1.08] text-[#111111] sm:text-6xl lg:text-7xl"
                )}
                style={{
                  textShadow:
                    "0 1px 0 rgba(255,255,255,0.9), 0 4px 16px rgba(17,24,39,0.1)",
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
            <div className="mx-auto mt-14 w-full max-w-5xl sm:mt-20 lg:max-w-6xl">
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
                From extraction to insights &amp; reminder alerts, Clarivo is
                designed for centralising and staying in control of your
                vendors.
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

        <ContactSection />
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
            <a href="#contact" className="transition-colors hover:text-[#111111]">
              Contact
            </a>
          </div>
        </div>
      </footer>

      <BookDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}
