import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-orange-200 bg-orange-50/40 px-6 py-12 text-center",
        className
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-[#F97316]/10">
        <Icon className="size-6 text-[#F97316]" />
      </div>
      <h3 className="text-base font-medium text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
