"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  ImagePlus,
  LifeBuoy,
  Loader2,
  MessageSquareText,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import { SUPPORT_TICKET_CATEGORIES } from "@/lib/email/support-ticket";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const cardClassName =
  "border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]";

const cardTitleClassName = "font-sans text-base font-semibold text-zinc-900";

function readImageFile(file: File, onLoad: (previewUrl: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      onLoad(reader.result);
    }
  };
  reader.readAsDataURL(file);
}

export function SupportPageClient({
  email,
  displayName,
  company,
}: {
  email: string;
  displayName: string;
  company: string;
}) {
  const [category, setCategory] = useState("bug");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const clearScreenshot = useCallback(() => {
    setScreenshot(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const applyScreenshot = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please attach an image file (PNG, JPG, GIF, or WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot must be 5 MB or smaller.");
      return;
    }

    setError(null);
    setScreenshot(file);
    readImageFile(file, setPreviewUrl);
  }, []);

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }

      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            applyScreenshot(file);
            break;
          }
        }
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [applyScreenshot]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("category", category);
      formData.set("subject", subject.trim());
      formData.set("description", description.trim());
      formData.set("pageUrl", window.location.href);
      if (screenshot) {
        formData.set("screenshot", screenshot);
      }

      const response = await fetch("/api/support", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        ticketId?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Could not submit your ticket.");
        return;
      }

      setTicketId(payload.ticketId ?? null);
      setSubject("");
      setDescription("");
      clearScreenshot();
      setCategory("bug");
    });
  }

  if (ticketId) {
    return (
      <Card className={cn(cardClassName, "max-w-2xl")}>
        <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-7" />
          </div>
          <div>
            <h2 className="font-sans text-xl font-semibold text-zinc-900">
              Ticket submitted
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Thanks{displayName ? `, ${displayName}` : ""}. We&apos;ve received
              your request and will reply to{" "}
              <span className="font-medium text-zinc-700">{email}</span>.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Reference
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-zinc-900">
              {ticketId}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setTicketId(null)}
            className="bg-[#F97316] text-white hover:bg-[#111827]"
          >
            Submit another ticket
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Card className={cardClassName}>
          <CardHeader className="pb-3">
            <CardTitle className={cn(cardTitleClassName, "flex items-center gap-2")}>
              <Sparkles className="size-4 text-[#F97316]" />
              Tips for faster help
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-600">
            <p>
              <strong className="text-zinc-800">Add a screenshot</strong> — it
              helps us see exactly what you&apos;re experiencing and usually
              cuts resolution time in half.
            </p>
            <p>
              Include the steps you took, what you expected, and what happened
              instead.
            </p>
            <p>
              Mention the page or feature involved (e.g. Alerts, Vendors,
              Analytics).
            </p>
          </CardContent>
        </Card>

        <Card className={cn(cardClassName, "bg-[#111827] text-white")}>
          <CardHeader className="pb-3">
            <CardTitle
              className={cn(
                cardTitleClassName,
                "flex items-center gap-2 text-white"
              )}
            >
              <LifeBuoy className="size-4 text-[#F97316]" />
              Your details
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Included automatically with your ticket.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Name</span>
              <span className="text-right text-zinc-100">
                {displayName || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Email</span>
              <span className="text-right text-zinc-100">{email}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-400">Company</span>
              <span className="text-right text-zinc-100">
                {company || "—"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle className={cn(cardTitleClassName, "flex items-center gap-2")}>
            <MessageSquareText className="size-4 text-[#F97316]" />
            Open a support ticket
          </CardTitle>
          <CardDescription>
            Describe the issue below. Paste a screenshot with{" "}
            <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs">
              Ctrl+V
            </kbd>{" "}
            or upload an image — screenshots help us fix things faster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="support-category"
                  className="text-sm font-medium text-zinc-700"
                >
                  Category
                </label>
                <select
                  id="support-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                >
                  {SUPPORT_TICKET_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="support-subject"
                  className="text-sm font-medium text-zinc-700"
                >
                  Subject
                </label>
                <Input
                  id="support-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Brief summary of the issue"
                  required
                  maxLength={200}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="support-description"
                className="text-sm font-medium text-zinc-700"
              >
                Description
              </label>
              <textarea
                id="support-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                rows={6}
                maxLength={5000}
                placeholder="What were you trying to do? What happened? Any error messages?"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 outline-none ring-[#F97316]/20 focus:border-[#F97316] focus:ring-2"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-zinc-700">
                  Screenshot{" "}
                  <span className="font-normal text-zinc-500">(recommended)</span>
                </label>
                {screenshot ? (
                  <button
                    type="button"
                    onClick={clearScreenshot}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div
                ref={dropzoneRef}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  if (!dropzoneRef.current?.contains(event.relatedTarget as Node)) {
                    setIsDragging(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  const file = event.dataTransfer.files?.[0];
                  if (file) applyScreenshot(file);
                }}
                className={cn(
                  "relative overflow-hidden rounded-xl border-2 border-dashed transition-colors",
                  isDragging
                    ? "border-[#F97316] bg-orange-50/60"
                    : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300"
                )}
              >
                {previewUrl ? (
                  <div className="relative p-3">
                    <img
                      src={previewUrl}
                      alt="Screenshot preview"
                      className="max-h-72 w-full rounded-lg border border-zinc-200 object-contain bg-white"
                    />
                    <button
                      type="button"
                      onClick={clearScreenshot}
                      className="absolute top-5 right-5 flex size-8 items-center justify-center rounded-full bg-white/95 text-zinc-600 shadow-sm hover:text-zinc-900"
                      aria-label="Remove screenshot"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-white text-[#F97316] shadow-sm">
                      <ImagePlus className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-800">
                        Drag & drop, paste, or browse for a screenshot
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        PNG, JPG, GIF, or WebP up to 5 MB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-zinc-200"
                    >
                      <Paperclip className="size-4" />
                      Choose image
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) applyScreenshot(file);
                  }}
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-500">
                We typically respond within one business day.
              </p>
              <Button
                type="submit"
                disabled={pending}
                className="bg-[#F97316] text-white hover:bg-[#111827]"
              >
                {pending ? <Loader2 className="animate-spin" /> : null}
                Submit ticket
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
