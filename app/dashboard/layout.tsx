import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      userEmail={user.email ?? "Signed in"}
      logo={
        <img
          src="/clarivo-logo.png"
          alt="Clarivo"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            display: "inline-block",
          }}
        />
      }
    >
      {children}
    </DashboardShell>
  );
}
