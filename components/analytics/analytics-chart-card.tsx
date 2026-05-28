import { cn } from "@/lib/utils";

export function AnalyticsChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
        className
      )}
    >
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
