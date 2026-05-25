"use client";

import { Paperclip } from "lucide-react";
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
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <Sidebar className="border-r border-orange-100/80">
        <SidebarHeader className="border-b border-orange-100/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F97316] shadow-md shadow-orange-500/20">
              <Paperclip className="size-5 text-white" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#F97316]">
                Clarivo
              </p>
              <p className="truncate text-xs text-zinc-500">
                Contract intelligence
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 py-4">
          <DashboardNav />
        </SidebarContent>

        <SidebarFooter className="border-t border-orange-100/60 p-4">
          <p className="mb-3 truncate text-xs text-zinc-500" title={userEmail}>
            {userEmail}
          </p>
          <SignOutButton />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-orange-100/60 bg-white px-4 md:hidden">
          <SidebarTrigger className="text-[#F97316]" />
          <Separator orientation="vertical" className="h-4" />
          <span className="font-semibold text-[#F97316]">Clarivo</span>
        </header>
        <main className="flex-1 overflow-auto bg-zinc-50/80 p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
