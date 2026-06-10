import { format, startOfToday } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getTodayReminderDate(): string {
  return format(startOfToday(), "yyyy-MM-dd");
}

export function isReminderDueToday(reminderDate: string): boolean {
  return reminderDate === getTodayReminderDate();
}

export type CustomReminder = {
  id: string;
  contract_id: string;
  title: string;
  reminder_date: string;
  notes: string | null;
  sent: boolean;
  dismissed: boolean;
};

export type CustomReminderInput = {
  contract_id: string;
  title: string;
  reminder_date: string;
  notes?: string;
};

function isCustomReminder(value: unknown): value is CustomReminder {
  if (!value || typeof value !== "object") return false;
  const row = value as CustomReminder;
  return (
    typeof row.id === "string" &&
    typeof row.contract_id === "string" &&
    typeof row.title === "string" &&
    typeof row.reminder_date === "string" &&
    (row.notes === null || typeof row.notes === "string") &&
    typeof row.sent === "boolean" &&
    typeof row.dismissed === "boolean"
  );
}

export function parseMetadataCustomReminders(
  metadata?: Record<string, unknown> | null
): CustomReminder[] {
  const raw = metadata?.custom_reminders;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isCustomReminder);
}

function isMissingRemindersTableError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("schema cache") && lower.includes("reminders");
}

function mapDbRow(row: {
  id: string;
  contract_id: string;
  title: string;
  reminder_date: string;
  notes: string | null;
  sent?: boolean | null;
  dismissed?: boolean | null;
}): CustomReminder {
  return {
    id: row.id,
    contract_id: row.contract_id,
    title: row.title,
    reminder_date: row.reminder_date,
    notes: row.notes,
    sent: row.sent ?? false,
    dismissed: row.dismissed ?? false,
  };
}

export async function listCustomReminders(
  supabase: SupabaseClient,
  userId: string,
  metadata?: Record<string, unknown> | null
): Promise<CustomReminder[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("id, contract_id, title, reminder_date, notes, sent, dismissed")
    .eq("user_id", userId)
    .eq("dismissed", false)
    .order("reminder_date", { ascending: true });

  if (!error) {
    return (data ?? []).map(mapDbRow);
  }

  if (!isMissingRemindersTableError(error.message)) {
    console.error("[reminders] listCustomReminders:", error.message);
    return [];
  }

  return parseMetadataCustomReminders(metadata).filter((row) => !row.dismissed);
}

export async function insertCustomReminder(
  supabase: SupabaseClient,
  userId: string,
  input: CustomReminderInput,
  metadata?: Record<string, unknown> | null
): Promise<{ error?: string; reminder?: CustomReminder }> {
  const title = input.title.trim();
  const notes = input.notes?.trim() || null;

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      user_id: userId,
      contract_id: input.contract_id,
      title,
      reminder_date: input.reminder_date,
      notes,
    })
    .select("id, contract_id, title, reminder_date, notes, sent, dismissed")
    .single();

  if (!error && data) {
    return { reminder: mapDbRow(data) };
  }

  if (!error) {
    return {};
  }

  if (!isMissingRemindersTableError(error.message)) {
    return { error: error.message };
  }

  const reminder: CustomReminder = {
    id: crypto.randomUUID(),
    contract_id: input.contract_id,
    title,
    reminder_date: input.reminder_date,
    notes,
    sent: false,
    dismissed: false,
  };

  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      custom_reminders: [...parseMetadataCustomReminders(metadata), reminder],
    },
  });

  if (metaError) {
    return {
      error:
        "Could not save reminder. Please run the latest database migrations in Supabase.",
    };
  }

  return { reminder };
}

export async function dismissCustomReminderRecord(
  supabase: SupabaseClient,
  userId: string,
  reminderId: string,
  metadata?: Record<string, unknown> | null
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("reminders")
    .update({ dismissed: true })
    .eq("id", reminderId)
    .eq("user_id", userId);

  if (!error) {
    return {};
  }

  if (!isMissingRemindersTableError(error.message)) {
    return { error: error.message };
  }

  const updated = parseMetadataCustomReminders(metadata).map((row) =>
    row.id === reminderId ? { ...row, dismissed: true } : row
  );

  const { error: metaError } = await supabase.auth.updateUser({
    data: { custom_reminders: updated },
  });

  if (metaError) {
    return {
      error:
        "Could not dismiss reminder. Please run the latest database migrations in Supabase.",
    };
  }

  return {};
}

export async function listDueCustomRemindersForUser(
  admin: SupabaseClient,
  userId: string,
  todayIso: string,
  metadata?: Record<string, unknown> | null
): Promise<CustomReminder[]> {
  const { data, error } = await admin
    .from("reminders")
    .select("id, contract_id, title, reminder_date, notes, sent, dismissed")
    .eq("user_id", userId)
    .eq("dismissed", false)
    .eq("sent", false)
    .eq("reminder_date", todayIso);

  if (!error) {
    return (data ?? []).map(mapDbRow);
  }

  if (!isMissingRemindersTableError(error.message)) {
    console.error("[reminders] listDueCustomRemindersForUser:", error.message);
    return [];
  }

  return parseMetadataCustomReminders(metadata).filter(
    (row) => !row.dismissed && !row.sent && row.reminder_date === todayIso
  );
}

async function markCustomRemindersSentMetadata(
  reminderIds: string[],
  metadata: Record<string, unknown> | null | undefined,
  persist: (updated: CustomReminder[]) => Promise<{ error?: string }>
): Promise<void> {
  const idSet = new Set(reminderIds);
  const updated = parseMetadataCustomReminders(metadata).map((row) =>
    idSet.has(row.id) ? { ...row, sent: true } : row
  );

  const { error } = await persist(updated);
  if (error) {
    console.error("[reminders] markCustomRemindersSent metadata:", error);
  }
}

export async function markCustomRemindersSentForOwner(
  supabase: SupabaseClient,
  reminderIds: string[],
  metadata?: Record<string, unknown> | null
): Promise<void> {
  if (reminderIds.length === 0) return;

  const { error } = await supabase
    .from("reminders")
    .update({ sent: true })
    .in("id", reminderIds);

  if (!error) {
    return;
  }

  if (!isMissingRemindersTableError(error.message)) {
    console.error("[reminders] markCustomRemindersSentForOwner:", error.message);
    return;
  }

  await markCustomRemindersSentMetadata(reminderIds, metadata, async (updated) => {
    const { error: metaError } = await supabase.auth.updateUser({
      data: { custom_reminders: updated },
    });
    return { error: metaError?.message };
  });
}

export async function markCustomRemindersSent(
  admin: SupabaseClient,
  userId: string,
  reminderIds: string[],
  metadata?: Record<string, unknown> | null
): Promise<void> {
  if (reminderIds.length === 0) return;

  const { error } = await admin
    .from("reminders")
    .update({ sent: true })
    .in("id", reminderIds);

  if (!error) {
    return;
  }

  if (!isMissingRemindersTableError(error.message)) {
    console.error("[reminders] markCustomRemindersSent:", error.message);
    return;
  }

  await markCustomRemindersSentMetadata(reminderIds, metadata, async (updated) => {
    const { error: metaError } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...(metadata ?? {}),
        custom_reminders: updated,
      },
    });
    return { error: metaError?.message };
  });
}
