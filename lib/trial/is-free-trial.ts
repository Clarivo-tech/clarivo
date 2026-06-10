import { isAwaitingPayment, type TrialPrefs } from "@/lib/trial/access";
import { hasActiveWorkspace } from "@/lib/trial/workspace-access";
import type { OrgContext } from "@/lib/team/types";

export function isFreeTrialUser(params: {
  preferences: TrialPrefs;
  context: Pick<OrgContext, "plan" | "isSubscribed"> | null;
  operatorBypass?: boolean;
}): boolean {
  if (params.operatorBypass) {
    return false;
  }

  const workspaceActive = hasActiveWorkspace(
    params.preferences,
    params.context
  );
  const awaitingPayment = isAwaitingPayment(params.preferences);
  return !workspaceActive && !awaitingPayment;
}
