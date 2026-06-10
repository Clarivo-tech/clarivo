"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  BarChart2,
  Bell,
  Building2,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { dismissTrialDocumentsHint } from "@/app/dashboard/actions";
import { DocumentsTrialHint } from "@/components/dashboard/documents-trial-hint";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/docs",
    label: "Documents",
    icon: FileText,
    exact: false,
  },
  {
    href: "/dashboard/vendors",
    label: "Vendors",
    icon: Building2,
    exact: false,
  },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChart2,
    exact: false,
  },
  {
    href: "/dashboard/performance",
    label: "Performance",
    icon: TrendingUp,
    exact: false,
  },
  {
    href: "/dashboard/contract-health",
    label: "Health",
    icon: HeartPulse,
    exact: false,
  },
  {
    href: "/dashboard/alerts",
    label: "Alerts & Reminders",
    icon: Bell,
    exact: false,
  },
  {
    href: "/dashboard/team",
    label: "My Team",
    icon: Users,
    exact: false,
  },
  {
    href: "/dashboard/support",
    label: "Support",
    icon: LifeBuoy,
    exact: false,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    exact: false,
  },
];

const platformAdminItem = {
  href: "/dashboard/admin",
  label: "Platform admin",
  icon: Shield,
  exact: false,
};

const DOCUMENTS_HREF = "/dashboard/docs";

export function DashboardNav({
  isPlatformAdmin = false,
  showDocumentsTrialHint = false,
}: {
  isPlatformAdmin?: boolean;
  showDocumentsTrialHint?: boolean;
}) {
  const pathname = usePathname();
  const items = isPlatformAdmin ? [...navItems, platformAdminItem] : navItems;
  const [hintVisible, setHintVisible] = useState(showDocumentsTrialHint);
  const [, startDismissTransition] = useTransition();

  const dismissHint = useCallback(() => {
    if (!hintVisible) return;
    setHintVisible(false);
    startDismissTransition(async () => {
      await dismissTrialDocumentsHint();
    });
  }, [hintVisible]);

  useEffect(() => {
    setHintVisible(showDocumentsTrialHint);
  }, [showDocumentsTrialHint]);

  useEffect(() => {
    if (
      hintVisible &&
      (pathname === DOCUMENTS_HREF || pathname.startsWith(`${DOCUMENTS_HREF}/`))
    ) {
      dismissHint();
    }
  }, [pathname, hintVisible, dismissHint]);

  return (
    <SidebarGroup>
      <SidebarGroupContent
        className={cn(hintVisible && "overflow-visible")}
      >
        <SidebarMenu className={cn("gap-1", hintVisible && "overflow-visible")}>
          {items.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
            const isDocuments = item.href === DOCUMENTS_HREF;

            return (
              <SidebarMenuItem
                key={item.href}
                className={cn(
                  isDocuments && hintVisible && "relative overflow-visible"
                )}
              >
                <SidebarMenuButton
                  isActive={isActive}
                  className={cn(
                    "h-10 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#F97316] text-white shadow-md shadow-orange-500/20 hover:bg-[#111827] hover:text-white data-active:bg-[#F97316] data-active:text-white"
                      : "text-zinc-400 hover:bg-white/[0.06] hover:text-white data-active:text-white"
                  )}
                  render={
                    <Link
                      href={item.href}
                      onClick={isDocuments && hintVisible ? dismissHint : undefined}
                    >
                      <item.icon className={cn(isActive && "text-white")} />
                      <span>{item.label}</span>
                    </Link>
                  }
                />
                {isDocuments && hintVisible ? (
                  <DocumentsTrialHint onDismiss={dismissHint} />
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
