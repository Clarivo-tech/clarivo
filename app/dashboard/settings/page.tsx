import { createClient } from "@/lib/supabase/server";
import { SettingsPageClient } from "@/components/dashboard/settings-page-client";
import { getUserPreferences } from "@/lib/data/user-preferences";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [displayName, preferences] = await Promise.all([
    Promise.resolve(
      (user.user_metadata?.display_name as string | undefined)?.trim() ?? ""
    ),
    getUserPreferences(supabase, user.id),
  ]);

  return (
    <SettingsPageClient
      email={user.email ?? ""}
      initialDisplayName={displayName}
      initialBaseCurrency={preferences.base_currency}
      memberSince={user.created_at}
    />
  );
}
