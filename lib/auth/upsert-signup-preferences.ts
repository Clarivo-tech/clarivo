import type { SupabaseClient } from "@supabase/supabase-js";

type SignupProfile = {
  userId: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  jobTitle?: string;
  contactNumber?: string;
  paidSignup: boolean;
};

function missingColumn(errorMessage: string, column: string): boolean {
  const lower = errorMessage.toLowerCase();
  return lower.includes(column.toLowerCase()) && lower.includes("schema cache");
}

function buildPreferencePayloads(profile: SignupProfile): Record<string, unknown>[] {
  const now = new Date();
  const trialExpiresAt = new Date(now);
  trialExpiresAt.setMinutes(trialExpiresAt.getMinutes() + 5);

  const core = {
    user_id: profile.userId,
    first_name: profile.firstName?.trim() ?? null,
    last_name: profile.lastName?.trim() ?? null,
    company: profile.company?.trim() ?? null,
    job_title: profile.jobTitle?.trim() ?? null,
    updated_at: now.toISOString(),
  };

  const billing = profile.paidSignup
    ? {
        trial_started_at: null,
        trial_expires_at: null,
        subscription_status: "pending_payment",
        trial_used: false,
      }
    : {
        trial_started_at: now.toISOString(),
        trial_expires_at: trialExpiresAt.toISOString(),
        subscription_status: "trial",
        trial_used: true,
      };

  const withContact = {
    ...core,
    ...billing,
    contact_number: profile.contactNumber?.trim() ?? null,
  };

  const withoutContact = { ...core, ...billing };
  const withoutTrialUsed = {
    ...core,
    contact_number: profile.contactNumber?.trim() ?? null,
    ...(profile.paidSignup
      ? {
          trial_started_at: null,
          trial_expires_at: null,
          subscription_status: "pending_payment",
        }
      : {
          trial_started_at: now.toISOString(),
          trial_expires_at: trialExpiresAt.toISOString(),
          subscription_status: "trial",
        }),
  };

  const paidMinimal = {
    user_id: profile.userId,
    first_name: profile.firstName?.trim() ?? null,
    last_name: profile.lastName?.trim() ?? null,
    company: profile.company?.trim() ?? null,
    job_title: profile.jobTitle?.trim() ?? null,
    subscription_status: "pending_payment",
    updated_at: now.toISOString(),
  };

  const trialMinimal = {
    user_id: profile.userId,
    first_name: profile.firstName?.trim() ?? null,
    last_name: profile.lastName?.trim() ?? null,
    company: profile.company?.trim() ?? null,
    job_title: profile.jobTitle?.trim() ?? null,
    trial_started_at: now.toISOString(),
    trial_expires_at: trialExpiresAt.toISOString(),
    subscription_status: "trial",
    updated_at: now.toISOString(),
  };

  return profile.paidSignup
    ? [withContact, withoutContact, withoutTrialUsed, paidMinimal]
    : [withContact, withoutContact, withoutTrialUsed, trialMinimal];
}

export async function upsertSignupPreferences(
  db: SupabaseClient,
  profile: SignupProfile
): Promise<{ error?: string }> {
  const payloads = buildPreferencePayloads(profile);

  for (const payload of payloads) {
    const { error } = await db
      .from("user_preferences")
      .upsert(payload, { onConflict: "user_id" });

    if (!error) {
      return {};
    }

    const message = error.message ?? "";
    const isLast = payload === payloads[payloads.length - 1];
    if (isLast) {
      return { error: message };
    }

    const shouldRetry =
      missingColumn(message, "trial_used") ||
      missingColumn(message, "contact_number") ||
      missingColumn(message, "subscription_status") ||
      missingColumn(message, "trial_started_at") ||
      missingColumn(message, "trial_expires_at") ||
      missingColumn(message, "first_name") ||
      missingColumn(message, "job_title");

    if (!shouldRetry) {
      return { error: message };
    }
  }

  return { error: "Could not save signup preferences." };
}
