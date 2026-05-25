import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  icon: Icon,
  className,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-zinc-500">{title}</p>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#F97316]/10">
          <Icon className="size-4 text-[#F97316]" strokeWidth={2} />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 tabular-nums">
        {value}
      </p>
    </div>
  );
}
