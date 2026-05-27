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
        "overflow-hidden rounded-xl border border-zinc-800 bg-[#111827] shadow-[0_4px_24px_rgba(0,0,0,0.2)]",
        className
      )}
    >
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
