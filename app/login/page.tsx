import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center">
          <Loader2 className="size-8 animate-spin text-[#F97316]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
