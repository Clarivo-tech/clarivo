import type { SupabaseClient } from "@supabase/supabase-js";

export function resolveTrialDocumentsHintDismissed(
  preferences: { trial_documents_hint_dismissed?: boolean | null },
  metadata?: Record<string, unknown> | null
): boolean {
  if (preferences.trial_documents_hint_dismissed === true) {
    return true;
  }
  return metadata?.trial_documents_hint_dismissed === true;
}

function isMissingHintColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("trial_documents_hint_dismissed") &&
    lower.includes("schema cache")
  );
}

export async function dismissTrialDocumentsHintRecord(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error?: string }> {
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      trial_documents_hint_dismissed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (!error) {
    return {};
  }

  if (!isMissingHintColumnError(error.message)) {
    return { error: error.message };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { trial_documents_hint_dismissed: true },
  });

  if (metaError) {
    return { error: metaError.message };
  }

  return {};
}
