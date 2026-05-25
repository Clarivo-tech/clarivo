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
      className="w-full border-white/10 bg-transparent text-zinc-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
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
