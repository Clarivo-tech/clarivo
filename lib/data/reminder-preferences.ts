import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserPreferences } from "@/lib/data/user-preferences";

export type ReminderPreferences = {
  remind_90_days: boolean;
  remind_60_days: boolean;
  remind_30_days: boolean;
  remind_14_days: boolean;
  remind_7_days: boolean;
  remind_renewal: boolean;
  remind_notice_deadline: boolean;
  remind_expiry: boolean;
};

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  remind_90_days: true,
  remind_60_days: true,
  remind_30_days: true,
  remind_14_days: false,
  remind_7_days: false,
  remind_renewal: true,
  remind_notice_deadline: true,
  remind_expiry: true,
};

function isReminderPreferences(value: unknown): value is ReminderPreferences {
  if (!value || typeof value !== "object") return false;
  const keys = Object.keys(DEFAULT_REMINDER_PREFERENCES) as (keyof ReminderPreferences)[];
  return keys.every((key) => typeof (value as ReminderPreferences)[key] === "boolean");
}

type ReminderPreferenceSource = Partial<
  Pick<UserPreferences, keyof ReminderPreferences>
>;

export function resolveReminderPreferences(
  preferences: ReminderPreferenceSource,
  metadata?: Record<string, unknown> | null
): ReminderPreferences {
  const fromMetadata = metadata?.reminder_preferences;
  if (isReminderPreferences(fromMetadata)) {
    return { ...DEFAULT_REMINDER_PREFERENCES, ...fromMetadata };
  }

  return {
    remind_90_days: preferences.remind_90_days ?? DEFAULT_REMINDER_PREFERENCES.remind_90_days,
    remind_60_days: preferences.remind_60_days ?? DEFAULT_REMINDER_PREFERENCES.remind_60_days,
    remind_30_days: preferences.remind_30_days ?? DEFAULT_REMINDER_PREFERENCES.remind_30_days,
    remind_14_days: preferences.remind_14_days ?? DEFAULT_REMINDER_PREFERENCES.remind_14_days,
    remind_7_days: preferences.remind_7_days ?? DEFAULT_REMINDER_PREFERENCES.remind_7_days,
    remind_renewal: preferences.remind_renewal ?? DEFAULT_REMINDER_PREFERENCES.remind_renewal,
    remind_notice_deadline:
      preferences.remind_notice_deadline ??
      DEFAULT_REMINDER_PREFERENCES.remind_notice_deadline,
    remind_expiry: preferences.remind_expiry ?? DEFAULT_REMINDER_PREFERENCES.remind_expiry,
  };
}

function isMissingReminderColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("schema cache") && lower.includes("remind_");
}

export async function upsertReminderPreferences(
  supabase: SupabaseClient,
  userId: string,
  input: ReminderPreferences
): Promise<{ error?: string; usedMetadataFallback?: boolean }> {
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      ...input,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (!error) {
    return {};
  }

  if (!isMissingReminderColumnError(error.message)) {
    return { error: error.message };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { reminder_preferences: input },
  });

  if (metaError) {
    return {
      error:
        "Could not save reminder preferences. Please run the latest database migrations in Supabase.",
    };
  }

  return { usedMetadataFallback: true };
}

export type ReminderPreferenceRow = {
  user_id: string;
  first_name: string | null;
} & ReminderPreferences;

export async function listReminderPreferenceRows(
  admin: SupabaseClient
): Promise<{ rows: ReminderPreferenceRow[]; error?: string }> {
  const columns =
    "user_id, first_name, remind_90_days, remind_60_days, remind_30_days, remind_14_days, remind_7_days, remind_renewal, remind_notice_deadline, remind_expiry";

  const { data, error } = await admin.from("user_preferences").select(columns);

  if (!error) {
    return { rows: (data ?? []) as ReminderPreferenceRow[] };
  }

  if (!isMissingReminderColumnError(error.message)) {
    return { rows: [], error: error.message };
  }

  const { data: basicRows, error: basicError } = await admin
    .from("user_preferences")
    .select("user_id, first_name");

  if (basicError) {
    return { rows: [], error: basicError.message };
  }

  const rows: ReminderPreferenceRow[] = [];

  for (const row of basicRows ?? []) {
    const { data: userResult } = await admin.auth.admin.getUserById(row.user_id);
    const resolved = resolveReminderPreferences(
      {},
      userResult.user?.user_metadata
    );
    rows.push({
      user_id: row.user_id,
      first_name: row.first_name,
      ...resolved,
    });
  }

  return { rows };
}
