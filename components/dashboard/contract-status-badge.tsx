import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContractDataStatus } from "@/lib/types/contracts";

const statusStyles: Record<ContractDataStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  expiring: "bg-orange-100 text-orange-800 border-orange-200",
  expired: "bg-red-100 text-red-800 border-red-200",
  renewed: "bg-sky-100 text-sky-800 border-sky-200",
  pending: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const statusLabels: Record<ContractDataStatus, string> = {
  active: "Active",
  expiring: "Expiring",
  expired: "Expired",
  renewed: "Renewed",
  pending: "Pending",
};

export function ContractStatusBadge({
  status,
}: {
  status: ContractDataStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", statusStyles[status])}
    >
      {statusLabels[status]}
    </Badge>
  );
}
