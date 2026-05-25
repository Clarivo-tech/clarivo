import {
  differenceInCalendarDays,
  format,
  parseISO,
  startOfToday,
  subDays,
} from "date-fns";
import type { ContractData } from "@/lib/types/contracts";

export type NoticePeriodStatus = "expired" | "warning" | "ok";

export type NoticePeriodItem = {
  contractId: string;
  vendorName: string;
  deadline: Date;
  deadlineLabel: string;
  status: NoticePeriodStatus;
  statusLabel: string;
};

export function getNoticeDeadline(
  renewalDate: string | null,
  noticePeriodDays: number | null
): Date | null {
  if (!renewalDate || noticePeriodDays == null) return null;
  try {
    return subDays(parseISO(renewalDate), noticePeriodDays);
  } catch {
    return null;
  }
}

function resolveStatus(deadline: Date): {
  status: NoticePeriodStatus;
  statusLabel: string;
} {
  const today = startOfToday();
  const daysUntil = differenceInCalendarDays(deadline, today);

  if (daysUntil < 0) {
    return {
      status: "expired",
      statusLabel: "Action Required - Notice period expired",
    };
  }
  if (daysUntil <= 14) {
    return {
      status: "warning",
      statusLabel: "Warning - Notice deadline approaching",
    };
  }
  return { status: "ok", statusLabel: "OK" };
}

export function buildNoticePeriodItems(rows: ContractData[]): NoticePeriodItem[] {
  const items: NoticePeriodItem[] = [];

  for (const row of rows) {
    const deadline = getNoticeDeadline(
      row.renewal_date,
      row.notice_period_days
    );
    if (!deadline) continue;

    const { status, statusLabel } = resolveStatus(deadline);
    items.push({
      contractId: row.contract_id,
      vendorName: row.vendor_name ?? "Unknown vendor",
      deadline,
      deadlineLabel: format(deadline, "MMM d, yyyy"),
      status,
      statusLabel,
    });
  }

  return items.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
}
