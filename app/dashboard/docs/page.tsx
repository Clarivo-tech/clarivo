import { createClient } from "@/lib/supabase/server";
import { getContracts } from "@/lib/data/contracts";
import { DocsPageClient } from "@/components/dashboard/docs-page-client";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const contracts = await getContracts(supabase, user.id);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            My Docs
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Upload a PDF — storage, AI extraction, and analysis complete in one step.
          </p>
        </div>
      </div>

      <DocsPageClient initialContracts={contracts} />
    </div>
  );
}
