import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrgContext } from "@/lib/team/types";
import {
  isAccountLocked,
  isAwaitingPayment,
  type TrialPrefs,
} from "@/lib/trial/access";
import { trialExpiryMsFromTimestamp } from "@/lib/trial/constants";

export function withFallbackTrialExpiry(
  prefs: TrialPrefs,
  userCreatedAt: string | undefined
): TrialPrefs {
  if (prefs.trial_expires_at || !userCreatedAt) {
    return prefs;
  }

  const status = (prefs.subscription_status ?? "").toLowerCase();
  if (status === "active" || isAwaitingPayment(prefs)) {
    return prefs;
  }

  const fallbackExpiry = new Date(
    trialExpiryMsFromTimestamp(new Date(userCreatedAt).getTime())
  ).toISOString();

  return {
    ...prefs,
    trial_expires_at: fallbackExpiry,
  };
}

export function hasActiveWorkspace(
  prefs: TrialPrefs,
  context: Pick<OrgContext, "plan" | "isSubscribed"> | null
): boolean {
  if (context?.isSubscribed) return true;
  if ((context?.plan ?? "").toLowerCase() === "pro") return true;
  return (prefs.subscription_status ?? "").toLowerCase() === "active";
}

export async function isWorkspaceLocked(
  db: SupabaseClient,
  userId: string,
  prefs: TrialPrefs,
  userCreatedAt?: string
): Promise<boolean> {
  if ((prefs.subscription_status ?? "").toLowerCase() === "active") {
    return false;
  }

  let organisationId: string | null = null;

  const { data: prefRow } = await db
    .from("user_preferences")
    .select("organisation_id")
    .eq("user_id", userId)
    .maybeSingle();

  organisationId = (prefRow?.organisation_id as string | undefined) ?? null;

  if (!organisationId) {
    const { data: membership } = await db
      .from("organisation_members")
      .select("organisation_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    organisationId = (membership?.organisation_id as string | undefined) ?? null;
  }

  if (organisationId) {
    const { data: org } = await db
      .from("organisations")
      .select("plan")
      .eq("id", organisationId)
      .maybeSingle();

    if ((org?.plan ?? "").toLowerCase() === "pro") {
      return false;
    }
  }

  return isAccountLocked(withFallbackTrialExpiry(prefs, userCreatedAt));
}
