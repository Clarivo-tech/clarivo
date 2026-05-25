import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContractFileStatus } from "@/lib/types/contracts";

const statusStyles: Record<ContractFileStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-sky-100 text-sky-800 border-sky-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  complete: "bg-emerald-100 text-emerald-800 border-emerald-200",
  failed: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels: Record<ContractFileStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Complete",
  complete: "Complete",
  failed: "Failed",
};

export function FileStatusBadge({ status }: { status: ContractFileStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}
