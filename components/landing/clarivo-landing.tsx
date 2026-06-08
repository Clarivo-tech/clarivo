"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart2,
  Bell,
  Building2,
  FileText,
  HeartPulse,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
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
    icon: "🏢",
    title: "Vendor Profiles",
    description:
      "Track every supplier with risk ratings, key contacts, linked contracts, document expiry alerts, and activity history.",
  },
  {
    icon: "👥",
    title: "Team and License Management",
    description:
      "Manage seat usage, invite teammates by company domain, and control access across your organisation workspace.",
  },
  {
    icon: "💬",
    title: "Contract AI Chat",
    description:
      "Ask natural-language questions across your entire portfolio, grounded only in your contract data.",
  },
  {
    icon: "📈",
    title: "Analytics and Exports",
    description:
      "Analyze vendor spend, portfolio growth, lifecycle timelines, risk registers, and export reports to CSV.",
  },
  {
    icon: "⭐",
    title: "Vendor Performance",
    description:
      "Score vendors against custom criteria on a 1–10 scale, track trends, and see portfolio-wide performance at a glance.",
  },
  {
    icon: "🛡️",
    title: "Contract and Relationship Health",
    description:
      "Score contracts by risk criteria and monitor vendor relationship health with clear AI-backed recommendations.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Upload",
    description:
      "Drop PDF contracts into Clarivo. Files are stored securely and ready for AI processing in seconds.",
  },
  {
    num: "02",
    title: "Extract",
    description:
      "AI reads each contract and pulls out vendor, value, currency, dates, notice periods, and renewal terms automatically.",
  },
  {
    num: "03",
    title: "Vendors",
    description:
      "Suppliers are organised into profiles with risk ratings, contacts, linked contracts, documents, and activity history.",
  },
  {
    num: "04",
    title: "Analytics",
    description:
      "View spend by vendor, portfolio growth, contract types, lifecycle timelines, and export insights to CSV.",
  },
  {
    num: "05",
    title: "Performance",
    description:
      "Score vendors 1–10 against custom criteria, track trends, and see portfolio-wide performance on your dashboard.",
  },
  {
    num: "06",
    title: "Health",
    description:
      "Get AI-backed contract and relationship health scores with clear recommendations on what needs attention.",
  },
  {
    num: "07",
    title: "Alerts & AI",
    description:
      "Set renewal and custom reminders, invite teammates to your workspace, and ask Contract AI questions grounded in your data.",
  },
];

const PLANS = [
  {
    name: "Enterprise",
    price: "£99.99",
    period: "/mo per license",
    description: "One plan with everything Clarivo offers.",
    features: [
      "Unlimited contracts",
      "AI contract extraction",
      "Live dashboard & portfolio insights",
      "Vendor profiles & document tracking",
      "Vendor performance scoring (1–10)",
      "Spend analytics & CSV exports",
      "Contract & relationship health scores",
      "Renewal & custom alerts",
      "Contract AI chat",
      "Team workspaces (up to 100 licenses)",
      "Multi-currency support",
      "Priority support",
    ],
    cta: "Sign up now",
    href: "/signup?intent=paid",
    highlighted: true,
  },
];

const STATS = [
  { value: "£2.3M", label: "avg spend tracked" },
  { value: "98%", label: "renewals caught" },
  { value: "<20s", label: "extraction time" },
  { value: "4.9★", label: "customer rating" },
];

const MOCK_NAV = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Vendors", icon: Building2, active: false },
  { label: "Analytics", icon: BarChart2, active: false },
  { label: "Performance", icon: TrendingUp, active: false },
  { label: "Health", icon: HeartPulse, active: false },
  { label: "Alerts", icon: Bell, active: false },
  { label: "My Team", icon: Users, active: false },
  { label: "Documents", icon: FileText, active: false },
  { label: "Settings", icon: Settings, active: false },
] as const;

const PORTFOLIO_POINTS = [42, 48, 45, 58, 62, 71, 68, 78, 85, 92];
const SPEND_BY_VENDOR = [
  { label: "RevForce", pct: 88, color: "#F97316" },
  { label: "FinanceCore", pct: 62, color: "#38BDF8" },
  { label: "DataSync", pct: 41, color: "#A855F7" },
  { label: "CloudHost", pct: 28, color: "#10B981" },
];
const CONTRACT_TYPES = [
  { label: "SaaS", pct: 72, color: "#F97316" },
  { label: "Services", pct: 48, color: "#38BDF8" },
  { label: "Lease", pct: 35, color: "#A855F7" },
  { label: "Other", pct: 22, color: "#10B981" },
];
const PERFORMANCE_VENDORS = [
  { name: "FinanceCore", score: 6.8, rag: "amber" as const },
  { name: "RevForce", score: 8.2, rag: "green" as const },
  { name: "DataSync", score: 4.1, rag: "red" as const },
];
const HEALTH_BREAKDOWN = [
  { label: "Healthy", count: 7, color: "#22c55e" },
  { label: "Watch", count: 3, color: "#F97316" },
  { label: "At risk", count: 2, color: "#ef4444" },
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

function performanceRagClass(rag: "green" | "amber" | "red") {
  if (rag === "green") return "bg-emerald-100 text-emerald-700";
  if (rag === "amber") return "bg-orange-100 text-[#111827]";
  return "bg-red-100 text-red-700";
}

function MockDashboard() {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
      <div className="flex min-h-[400px]">
        <div className="hidden w-[152px] shrink-0 border-r border-white/[0.08] bg-[#111827] px-2 py-3 sm:block">
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
          <nav className="mt-3 space-y-0.5">
            {MOCK_NAV.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[9px] font-medium",
                  item.active
                    ? "bg-[#F97316] text-white shadow-sm shadow-orange-500/30"
                    : "text-zinc-500"
                )}
              >
                <item.icon className="size-3 shrink-0" strokeWidth={2} />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </nav>
        </div>

        <div className="min-w-0 flex-1 bg-zinc-50/80 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-zinc-800">Dashboard</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Trial active
            </span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {(
              [
                { label: "Contracts", val: "12", highlight: false },
                { label: "Vendors", val: "4", highlight: false },
                { label: "Portfolio", val: "£284k", highlight: false },
                { label: "Avg score", val: "6.8/10", highlight: true },
                { label: "Alerts", val: "3", highlight: false },
              ] as const
            ).map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5"
              >
                <p className="text-[7px] text-zinc-500 sm:text-[8px]">{s.label}</p>
                <p
                  className={cn(
                    "text-xs font-bold sm:text-sm",
                    s.highlight ? "text-[#F97316]" : "text-zinc-900"
                  )}
                >
                  {s.val}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-2.5 grid gap-2 lg:grid-cols-[1fr_0.72fr]">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                  Portfolio growth
                </p>
                <MockLineChart />
                <div className="mt-1 flex justify-between text-[8px] text-zinc-400">
                  <span>Jan</span>
                  <span className="font-medium text-emerald-600">+18% YoY</span>
                  <span>Dec</span>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                  Spend by vendor
                </p>
                <div className="mt-2 space-y-1.5">
                  {SPEND_BY_VENDOR.map((t) => (
                    <div key={t.label} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 truncate text-[8px] text-zinc-600">
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

              <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                  Vendor performance
                </p>
                <div className="mt-2 space-y-1.5">
                  {PERFORMANCE_VENDORS.map((v) => (
                    <div
                      key={v.name}
                      className="flex items-center justify-between gap-2 rounded-md border border-zinc-100 bg-zinc-50/80 px-2 py-1"
                    >
                      <span className="truncate text-[9px] font-medium text-zinc-800">
                        {v.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold tabular-nums",
                          performanceRagClass(v.rag)
                        )}
                      >
                        {v.score}/10
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                  Contract health
                </p>
                <div className="mt-2 flex gap-2">
                  {HEALTH_BREAKDOWN.map((h) => (
                    <div
                      key={h.label}
                      className="flex flex-1 flex-col items-center rounded-md border border-zinc-100 bg-zinc-50/80 px-1 py-2"
                    >
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: h.color }}
                      >
                        {h.count}
                      </span>
                      <span className="mt-0.5 text-[7px] text-zinc-500">{h.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 space-y-1">
                  {CONTRACT_TYPES.slice(0, 3).map((t) => (
                    <div key={t.label} className="flex items-center gap-2">
                      <span className="w-10 shrink-0 text-[8px] text-zinc-600">
                        {t.label}
                      </span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100">
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
                    Ask about renewals, vendor scores, spend, and contract health across
                    your portfolio.
                  </div>
                  <div className="ml-auto max-w-[92%] rounded-lg rounded-br-sm bg-[#F97316] px-2 py-1.5 text-[9px] text-white">
                    Which vendors need attention this quarter?
                  </div>
                  <div className="rounded-lg rounded-bl-sm bg-white/95 px-2 py-1.5 text-[9px] leading-snug text-[#111827]">
                    <span className="font-medium text-[#F97316]">DataSync</span> (4.1/10
                    performance, at-risk health). Notice period in 14 days. £86k exposure.
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
                  Alerts & reminders
                </p>
                <div className="mt-1.5 space-y-1 text-[9px]">
                  <p className="rounded-md bg-red-50 px-2 py-1 font-medium text-red-700">
                    DataSync — notice in 14 days
                  </p>
                  <p className="rounded-md bg-orange-50 px-2 py-1 font-medium text-[#111827]">
                    FinanceCore — review due
                  </p>
                  <p className="rounded-md bg-sky-50 px-2 py-1 font-medium text-sky-800">
                    RevForce — insurance expires 30 Jun
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
            <a href="#contact" className="transition-colors hover:text-[#111111]">
              Demo
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/signup?intent=paid"
              className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-semibold text-purple-800 transition-colors hover:bg-purple-100 sm:px-4"
            >
              Sign up now
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-[#F97316] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#111827] sm:px-4"
            >
              Log in
            </Link>
            <Link
              href="/book-demo"
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-100 sm:px-4"
            >
              Demo with a human
            </Link>
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
                Smart Vendor & Contract Intelligence
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#555555] sm:text-lg">
                Upload your contracts, Clarivo will do the rest.
              </p>
              <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row">
                <Link
                  href="/signup?intent=trial"
                  className="w-full rounded-lg bg-[#F97316] px-6 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#111827] sm:w-auto"
                >
                  Start free trial
                </Link>
                <Link
                  href="/book-demo"
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-6 py-3.5 text-center text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-100 sm:w-auto"
                >
                  Demo with a human
                </Link>
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
                  className="group rounded-xl border border-white/10 bg-[#111827] p-6 transition-all hover:border-[#F97316]/70 hover:shadow-[0_10px_30px_rgba(17,24,39,0.45)]"
                >
                  <span className="text-2xl text-white" aria-hidden>
                    {feature.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">
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
            <p className="mx-auto mt-4 max-w-2xl text-center text-[#555555]">
              From upload to vendor scores, health insights, and team collaboration
              — everything in one workflow.
            </p>
            <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {STEPS.map((step) => (
                <div
                  key={step.num}
                  className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm"
                >
                  <p
                    className={cn(
                      displayFont,
                      "text-4xl font-bold text-[#F97316] sm:text-5xl"
                    )}
                  >
                    {step.num}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-[#333333]">
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
                      ? "border-white/10 bg-[#111827] shadow-[0_0_40px_rgba(17,24,39,0.35)]"
                      : "border-[#e5e5e5] bg-[#f9f9f9]"
                  )}
                >
                  {plan.highlighted ? (
                    <span className="mb-4 inline-flex w-fit rounded-full bg-[#F97316] px-3 py-0.5 text-xs font-semibold text-white">
                      Most popular
                    </span>
                  ) : null}
                  <h3
                    className={cn(
                      "text-lg font-semibold",
                      plan.highlighted ? "text-white" : "text-[#333333]"
                    )}
                  >
                    {plan.name}
                  </h3>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span
                      className={cn(
                        displayFont,
                        "text-4xl font-bold",
                        plan.highlighted ? "text-white" : "text-[#111111]"
                      )}
                    >
                      {plan.price}
                    </span>
                    {plan.period ? (
                      <span
                        className={cn(
                          plan.highlighted ? "text-zinc-300" : "text-[#555555]"
                        )}
                      >
                        {plan.period}
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={cn(
                      "mt-3 text-sm",
                      plan.highlighted ? "text-zinc-300" : "text-[#555555]"
                    )}
                  >
                    {plan.description}
                  </p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className={cn(
                          "flex items-start gap-2 text-sm",
                          plan.highlighted ? "text-zinc-200" : "text-[#555555]"
                        )}
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
                          ? "bg-[#F97316] text-white hover:bg-[#111827]"
                          : "border border-[#e5e5e5] text-[#111111] hover:border-[#cccccc]"
                      )}
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <Link
                      href="/book-demo"
                      className="mt-8 block rounded-lg border border-[#e5e5e5] py-3 text-center text-sm font-semibold text-[#111111] transition-colors hover:border-[#cccccc]"
                    >
                      {plan.cta}
                    </Link>
                  )}
                </article>
              ))}
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

    </div>
  );
}
