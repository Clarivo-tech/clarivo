"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { fetchContractDataForCurrentUser } from "@/lib/data/contracts-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function ContractChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Ask me anything about your uploaded contracts — value, renewals, vendors, dates, and more.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="border-b border-zinc-100 px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[#F97316]/10">
            <MessageSquare className="size-4 text-[#F97316]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Ask about your contracts
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Natural language answers from your uploaded contract data only.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <div
          ref={scrollRef}
          className="flex max-h-96 min-h-56 flex-col gap-4 overflow-y-auto rounded-xl bg-zinc-50/80 px-4 py-5"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[88%] px-4 py-3 text-[13px] leading-relaxed",
                  msg.role === "user"
                    ? "rounded-2xl rounded-br-md bg-[#F97316] text-white shadow-sm"
                    : "rounded-2xl rounded-bl-md border border-zinc-200/80 bg-white text-zinc-700 shadow-sm"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-zinc-200/80 bg-white px-4 py-3 text-[13px] text-zinc-500 shadow-sm">
                <span className="flex gap-1">
                  <span className="size-1.5 animate-bounce rounded-full bg-[#F97316] [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-[#F97316] [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-[#F97316]" />
                </span>
                <span>Thinking…</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-end gap-3 rounded-xl border border-zinc-200/80 bg-white p-2 shadow-sm focus-within:border-[#F97316]/40 focus-within:ring-2 focus-within:ring-[#F97316]/15">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. What is my total contract value? Which renewals are coming up?"
            disabled={loading}
            rows={1}
            className="max-h-32 min-h-[44px] flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 disabled:opacity-50"
          />
          <Button
            type="button"
            onClick={() => void sendMessage()}
            disabled={loading || !input.trim()}
            size="icon"
            className="size-10 shrink-0 rounded-lg bg-[#F97316] text-white hover:bg-[#EA580C] disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
