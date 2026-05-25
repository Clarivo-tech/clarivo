"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export function DashboardShell({
  userEmail,
  logo,
  children,
}: {
  userEmail: string;
  logo: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar className="border-r border-white/[0.08] bg-[#111827] text-white">
        <SidebarHeader className="border-b border-white/[0.08] p-5">
          <div className="flex items-center gap-3">
            {logo}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-white">
                Clarivo
              </p>
              <p className="truncate text-xs text-zinc-400">
                Contract intelligence
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-5">
          <DashboardNav />
        </SidebarContent>

        <SidebarFooter className="border-t border-white/[0.08] p-4">
          <p
            className="mb-3 truncate text-xs text-zinc-500"
            title={userEmail}
          >
            {userEmail}
          </p>
          <SignOutButton />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-[#FAFAFA]">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-zinc-200/80 bg-white px-4 md:hidden">
          <SidebarTrigger className="text-[#F97316]" />
          <Separator orientation="vertical" className="h-4" />
          <span className="font-semibold tracking-tight text-zinc-900">
            Clarivo
          </span>
        </header>
        <main className="flex-1 overflow-auto p-6 md:p-8 lg:p-10">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
