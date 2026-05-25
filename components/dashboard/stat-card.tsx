import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card
      className={cn(
        "border-orange-100/80 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500">
          {title}
        </CardTitle>
        <div className="flex size-9 items-center justify-center rounded-lg bg-[#F97316]/10">
          <Icon className="size-4 text-[#F97316]" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-zinc-900">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
