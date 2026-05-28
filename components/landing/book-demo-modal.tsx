"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const displayFont =
  "font-semibold tracking-[-0.02em] [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Display','Segoe_UI',system-ui,sans-serif]";

type BookDemoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BookDemoModal({ open, onOpenChange }: BookDemoModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setTimeout(() => {
        setSubmitted(false);
        setName("");
        setEmail("");
        setCompany("");
        setSubmitting(false);
        setError(null);
      }, 200);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong — please email hello@clarivo-tech.com");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-[#e5e5e5] bg-white text-[#111111] sm:max-w-md">
        {submitted ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto size-12 text-[#F97316]" />
            <DialogHeader className="mt-4 items-center text-center">
              <DialogTitle className="text-xl font-semibold tracking-tight text-[#111111]">
                Demo Requested
              </DialogTitle>
              <DialogDescription className="text-[#555555]">
                Someone will be in touch shortly.
              </DialogDescription>
            </DialogHeader>
            <Button
              type="button"
              className="mt-6 w-full bg-[#F97316] text-white hover:bg-[#EA580C]"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className={`${displayFont} text-xl text-[#111111]`}>
                Book a demo
              </DialogTitle>
              <DialogDescription className="text-[#555555]">
                See how Clarivo extracts terms, tracks renewals, and surfaces
                portfolio risk in minutes.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-2 space-y-4">
              <div>
                <label
                  htmlFor="demo-name"
                  className="mb-1.5 block text-xs font-medium text-[#555555]"
                >
                  Name
                </label>
                <input
                  id="demo-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/30"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label
                  htmlFor="demo-email"
                  className="mb-1.5 block text-xs font-medium text-[#555555]"
                >
                  Email
                </label>
                <input
                  id="demo-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/30"
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <label
                  htmlFor="demo-company"
                  className="mb-1.5 block text-xs font-medium text-[#555555]"
                >
                  Company
                </label>
                <input
                  id="demo-company"
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[#e5e5e5] bg-white px-3 text-sm text-[#111111] outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/30"
                  placeholder="Acme Ltd"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#F97316] text-white hover:bg-[#EA580C]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending request...
                  </>
                ) : (
                  "Request demo"
                )}
              </Button>
              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
