"use client";

import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";
import { MobileDrawer } from "./MobileDrawer";
import type { NavItem } from "@/lib/constants/nav";

export function DashboardShell({
  sidebarItems,
  bottomNavItems,
  title,
  children,
}: {
  sidebarItems: NavItem[];
  bottomNavItems: NavItem[];
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh bg-background">
      <Sidebar items={sidebarItems} />
      <MobileDrawer items={sidebarItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar title={title} />
        <main className="flex-1 px-4 pb-24 pt-6 lg:px-6 lg:pb-10">{children}</main>
      </div>
      <BottomNav items={bottomNavItems} />
    </div>
  );
}
