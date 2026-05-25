import { Settings } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your account and preferences.
        </p>
      </div>

      <EmptyState
        icon={Settings}
        title="Settings coming soon"
        description="Account preferences and notification settings will be available here."
      />
    </div>
  );
}
