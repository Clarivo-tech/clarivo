export type LicenseSummary = {
  purchased: number;
  utilized: number;
  available: number;
};

export function computeLicenseSummary(
  activeMemberCount: number,
  pendingInviteCount: number,
  seatLimit: number
): LicenseSummary {
  const purchased = Math.max(1, seatLimit);
  const utilized = activeMemberCount + pendingInviteCount;
  const available = Math.max(0, purchased - utilized);

  return { purchased, utilized, available };
}

export function canAllocateLicense(summary: LicenseSummary): boolean {
  return summary.available > 0;
}
