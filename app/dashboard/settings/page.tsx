import { createClient } from "@/lib/supabase/server";
import { SettingsPageClient } from "@/components/dashboard/settings-page-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const displayName =
    (user.user_metadata?.display_name as string | undefined)?.trim() ?? "";

  return (
    <SettingsPageClient
      email={user.email ?? ""}
      initialDisplayName={displayName}
      memberSince={user.created_at}
    />
  );
}
