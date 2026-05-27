"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BookDemoModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BookDemoModal({ open, onOpenChange }: BookDemoModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setTimeout(() => {
        setSubmitted(false);
        setName("");
        setEmail("");
        setCompany("");
      }, 200);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-zinc-800 bg-zinc-950 text-white sm:max-w-md">
        {submitted ? (
          <div className="py-4 text-center">
            <CheckCircle2 className="mx-auto size-12 text-[#F97316]" />
            <DialogHeader className="mt-4 items-center text-center">
              <DialogTitle className="font-heading text-xl text-white">
                You&apos;re on the list
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Thanks{name ? `, ${name}` : ""}! We&apos;ll reach out within one
                business day to schedule your Clarivo demo.
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
              <DialogTitle className="font-heading text-xl text-white">
                Book a demo
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                See how Clarivo extracts terms, tracks renewals, and surfaces
                portfolio risk in minutes.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-2 space-y-4">
              <div>
                <label
                  htmlFor="demo-name"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Name
                </label>
                <input
                  id="demo-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-700 bg-black px-3 text-sm text-white outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/30"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label
                  htmlFor="demo-email"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Email
                </label>
                <input
                  id="demo-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-700 bg-black px-3 text-sm text-white outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/30"
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <label
                  htmlFor="demo-company"
                  className="mb-1.5 block text-xs font-medium text-zinc-400"
                >
                  Company
                </label>
                <input
                  id="demo-company"
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-10 w-full rounded-lg border border-zinc-700 bg-black px-3 text-sm text-white outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/30"
                  placeholder="Acme Ltd"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#F97316] text-white hover:bg-[#EA580C]"
              >
                Request demo
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
