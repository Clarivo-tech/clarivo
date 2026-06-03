import type { SupabaseClient } from "@supabase/supabase-js";
import { TRIAL_EXPIRED_MESSAGE } from "@/lib/trial/constants";

export type TrialEligibilityResult =
  | { eligible: true }
  | {
      eligible: false;
      message: string;
      reason: "trial_used" | "active" | "exists";
    };

export async function getTrialEligibilityForEmail(
  admin: SupabaseClient,
  email: string
): Promise<TrialEligibilityResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { eligible: true };
  }

  const { data, error } = await admin.rpc("check_trial_eligibility", {
    p_email: normalized,
  });

  if (error) {
    console.error("[trial] check_trial_eligibility:", error.message);
    return { eligible: true };
  }

  const payload = data as {
    eligible?: boolean;
    reason?: string | null;
  } | null;

  if (payload?.eligible !== false) {
    return { eligible: true };
  }

  const reason = payload?.reason ?? "trial_used";

  if (reason === "active") {
    return {
      eligible: false,
      message: "An account with this email already exists. Please sign in.",
      reason: "active",
    };
  }

  return {
    eligible: false,
    message: TRIAL_EXPIRED_MESSAGE,
    reason: reason === "exists" ? "exists" : "trial_used",
  };
}
