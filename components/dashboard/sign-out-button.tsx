"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { signOut } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      className="w-full border-orange-200 text-zinc-600 hover:bg-orange-50 hover:text-[#EA580C]"
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <LogOut />
      )}
      Sign out
    </Button>
  );
}
