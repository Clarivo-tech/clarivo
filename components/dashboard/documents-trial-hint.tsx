"use client";

import { X } from "lucide-react";

export function DocumentsTrialHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="pointer-events-auto absolute left-[calc(100%+0.5rem)] top-1/2 z-[60] w-44 -translate-y-1/2 rounded-lg border border-orange-200/90 bg-orange-50 px-2.5 py-2 shadow-lg shadow-black/25"
    >
      <div className="flex items-start gap-1.5">
        <p className="flex-1 text-[11px] font-medium leading-snug text-[#111827]">
          Start by uploading some contracts
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss hint"
          className="shrink-0 rounded p-0.5 text-zinc-500 transition-colors hover:bg-orange-100 hover:text-zinc-800"
        >
          <X className="size-3" />
        </button>
      </div>
      <span
        aria-hidden
        className="absolute -left-1.5 top-1/2 size-2.5 -translate-y-1/2 rotate-45 border-b border-l border-orange-200/90 bg-orange-50"
      />
    </div>
  );
}
