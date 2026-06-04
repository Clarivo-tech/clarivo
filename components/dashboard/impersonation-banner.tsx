"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImpersonationBanner({
  targetEmail,
}: {
  targetEmail: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function exitImpersonation() {
    startTransition(async () => {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      router.push("/dashboard/admin");
      router.refresh();
    });
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-amber-950">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldAlert className="size-4 shrink-0" />
        Viewing as <strong>{targetEmail}</strong> (super user mode)
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-amber-400 bg-white"
        disabled={pending}
        onClick={exitImpersonation}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Exit to admin"
        )}
      </Button>
    </div>
  );
}
