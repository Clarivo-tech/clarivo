"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const displayFont =
  "font-semibold tracking-[-0.02em] [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Segoe_UI',system-ui,sans-serif]";

export function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setError("Something went wrong — please email hello@clarivo-tech.com");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="contact"
      className="border-t border-[#e5e5e5] bg-white px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316]">
            Contact
          </p>
          <h2
            className={cn(
              displayFont,
              "mt-3 text-3xl font-bold text-[#111111] sm:text-4xl"
            )}
          >
            Get in touch
          </h2>
          <p className="mt-4 max-w-md text-[#555555]">
            Questions about Clarivo, pricing, or enterprise rollout? Send us a
            message and we&apos;ll get back to you as soon as we can.
          </p>
          <p className="mt-6 text-sm text-[#666666]">
            Or email us directly at{" "}
            <a
              href="mailto:hello@clarivo-tech.com"
              className="font-medium text-[#F97316] hover:text-[#111827] hover:underline"
            >
              hello@clarivo-tech.com
            </a>
          </p>
        </div>

        <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-6 shadow-sm sm:p-8">
          {submitted ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle2 className="size-12 text-[#F97316]" />
              <h3 className={cn(displayFont, "mt-4 text-xl text-[#111111]")}>
                Message sent
              </h3>
              <p className="mt-2 max-w-sm text-sm text-[#555555]">
                Thanks for reaching out. We&apos;ll reply to your email shortly.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-6 text-sm font-medium text-[#F97316] hover:text-[#111827] hover:underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-name" className="text-sm font-medium text-[#111111]">
                  Name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  placeholder="Jane Smith"
                  className="h-11 rounded-lg border border-[#e5e5e5] bg-white px-3 text-sm text-[#111111] outline-none transition-colors focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-email" className="text-sm font-medium text-[#111111]">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  placeholder="you@company.com"
                  className="h-11 rounded-lg border border-[#e5e5e5] bg-white px-3 text-sm text-[#111111] outline-none transition-colors focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-message" className="text-sm font-medium text-[#111111]">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={submitting}
                  placeholder="Tell us how we can help…"
                  className="resize-y rounded-lg border border-[#e5e5e5] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none transition-colors focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="mt-1 flex h-11 items-center justify-center gap-2 rounded-lg bg-[#F97316] text-sm font-semibold text-white transition-colors hover:bg-[#111827] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send message"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
