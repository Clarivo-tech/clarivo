import { createClient } from "@/lib/supabase/server";
import { getVendorPageData } from "@/lib/data/vendors";
import { getUserPreferences } from "@/lib/data/user-preferences";
import { VendorsPageClient } from "@/components/dashboard/vendors-page-client";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [preferences, { rows, stats }] = await Promise.all([
    getUserPreferences(supabase, user.id),
    getVendorPageData(supabase, user.id),
  ]);

  return (
    <VendorsPageClient
      rows={rows}
      stats={stats}
      baseCurrency={preferences.base_currency}
    />
  );
}
