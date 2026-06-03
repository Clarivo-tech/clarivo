import { formatVendorStatus } from "@/lib/vendors/constants";
import type { VendorStatus } from "@/lib/types/vendors";
import { cn } from "@/lib/utils";

export function VendorStatusBadge({
  status,
  className,
}: {
  status: VendorStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1",
        status === "active" &&
          "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
        status === "inactive" &&
          "bg-zinc-100 text-zinc-600 ring-zinc-200/80",
        status === "under_review" &&
          "bg-amber-50 text-amber-800 ring-amber-200/80",
        className
      )}
    >
      {formatVendorStatus(status)}
    </span>
  );
}
