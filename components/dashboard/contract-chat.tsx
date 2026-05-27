"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, MessageSquare, Send } from "lucide-react";
import { fetchContractDataForCurrentUser } from "@/lib/data/contracts-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Ask about your contracts — value, renewals, vendors, and dates.",
};

type ContractChatProps = {
  variant?: "compact" | "full";
  className?: string;
};

export function ContractChat({
  variant = "full",
  className,
}: ContractChatProps) {
  const compact = variant === "compact";
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isCompactView = compact && !expanded;
  const visibleMessages = isCompactView
    ? messages.filter((m) => m.id !== "welcome").slice(-3)
    : messages;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [visibleMessages, loading, expanded]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setInput("");

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const contractData = await fetchContractDataForCurrentUser();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, contractData }),
      });

      const payload = (await response.json()) as {
        reply?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to get a response.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: payload.reply ?? "No response received.",
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Sorry, I couldn't answer that: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <section
      className={cn(
        compact
          ? "rounded-xl border border-zinc-800 bg-[#0a0a0a] shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
          : "rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
        compact && !expanded && "flex min-h-[220px] flex-col",
        compact && expanded && "col-span-full",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b",
          compact
            ? "border-zinc-800 px-4 py-3"
            : "border-zinc-100 px-6 py-5"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-lg",
              compact ? "size-8 bg-[#F97316]/20" : "size-9 bg-[#F97316]/10"
            )}
          >
            <MessageSquare className="size-4 text-[#F97316]" />
          </div>
          <div className="min-w-0">
            <h2
              className={cn(
                "font-semibold",
                compact ? "text-sm text-white" : "text-base text-zinc-900"
              )}
            >
              Ask Clarivo AI
            </h2>
            {compact ? (
              <p className="mt-0.5 text-sm text-zinc-300">
                Ask about your contracts — value, renewals, vendors, and dates.
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-zinc-500">
                Natural language answers from your uploaded contract data only.
              </p>
            )}
          </div>
        </div>
        {compact && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="shrink-0 text-xs text-[#F97316] hover:bg-white/10 hover:text-[#FB923C]"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3.5" />
                Collapse
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" />
                View full chat
              </>
            )}
          </Button>
        )}
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col",
          compact ? "gap-3 p-4" : "gap-4 p-6"
        )}
      >
        <div
          ref={scrollRef}
          className={cn(
            "flex flex-col gap-2 overflow-y-auto rounded-lg",
            compact ? "bg-black" : "bg-zinc-50/80",
            compact
              ? isCompactView
                ? "min-h-[176px] flex-1 max-h-[176px] px-3 py-2.5"
                : "max-h-[min(70vh,32rem)] min-h-56 flex-1 px-3 py-2.5"
              : "max-h-96 min-h-56 gap-4 px-4 py-5"
          )}
        >
          {visibleMessages.length === 0 && isCompactView && (
            <p className="text-[11px] leading-snug text-zinc-400">
              {WELCOME_MESSAGE.content}
            </p>
          )}
          {visibleMessages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "leading-relaxed",
                  isCompactView
                    ? "max-w-[95%] px-3 py-2 text-xs"
                    : "max-w-[88%] px-4 py-3 text-[13px]",
                  msg.role === "user"
                    ? "rounded-xl rounded-br-sm bg-[#F97316] text-white"
                    : compact
                      ? "rounded-xl rounded-bl-sm bg-white text-[#111827]"
                      : "rounded-xl rounded-bl-sm border border-zinc-200/80 bg-white text-zinc-700"
                )}
              >
                <p
                  className={cn(
                    "whitespace-pre-wrap",
                    isCompactView ? "line-clamp-4" : undefined
                  )}
                >
                  {msg.content}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-xl",
                  compact
                    ? "bg-white px-2 py-1 text-[10px] text-[#111827]"
                    : cn(
                        "border border-zinc-200/80 bg-white text-zinc-500",
                        isCompactView
                          ? "px-2 py-1 text-[10px]"
                          : "px-4 py-3 text-[13px]"
                      )
                )}
              >
                <Loader2 className="size-3 animate-spin text-[#F97316]" />
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p
            className={cn(
              compact ? "text-[11px] text-red-400" : "text-sm text-red-600"
            )}
            role="alert"
          >
            {error}
          </p>
        )}

        <div
          className={cn(
            "flex items-center gap-2 rounded-lg",
            compact
              ? "border border-zinc-800 bg-[#1a1a1a] p-1.5 focus-within:border-[#F97316]/50 focus-within:ring-2 focus-within:ring-[#F97316]/20"
              : "gap-3 border border-zinc-200/80 bg-white p-2 focus-within:border-[#F97316]/40 focus-within:ring-2 focus-within:ring-[#F97316]/15"
          )}
        >
          {compact ? (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your contracts…"
              disabled={loading}
              rows={2}
              className="min-h-[52px] flex-1 resize-none rounded-md border-0 bg-white px-2 py-2 text-xs text-[#111827] placeholder:text-[#6b7280] focus:outline-none disabled:opacity-50"
            />
          ) : (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. What is my total contract value? Which renewals are coming up?"
              disabled={loading}
              rows={1}
              className="max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 disabled:opacity-50"
            />
          )}
          <Button
            type="button"
            onClick={() => void sendMessage()}
            disabled={loading || !input.trim()}
            size="icon"
            className={cn(
              "shrink-0 rounded-lg bg-[#F97316] text-white hover:bg-[#EA580C] disabled:opacity-40",
              compact ? "size-8" : "size-10"
            )}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
