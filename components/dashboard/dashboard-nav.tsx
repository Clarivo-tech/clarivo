"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  Bell,
  Building2,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
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

export function DashboardNav({
  isPlatformAdmin = false,
}: {
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();
  const items = isPlatformAdmin ? [...navItems, platformAdminItem] : navItems;

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={isActive}
                  className={cn(
                    "h-10 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#F97316] text-white shadow-md shadow-orange-500/20 hover:bg-[#111827] hover:text-white data-active:bg-[#F97316] data-active:text-white"
                      : "text-zinc-400 hover:bg-white/[0.06] hover:text-white data-active:text-white"
                  )}
                  render={
                    <Link href={item.href}>
                      <item.icon className={cn(isActive && "text-white")} />
                      <span>{item.label}</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
