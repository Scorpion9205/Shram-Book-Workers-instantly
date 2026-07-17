import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  CalendarCheck,
  Star,
  User,
  Settings,
  Zap,
  Users,
  UserCog,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const workerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/worker/dashboard", icon: LayoutDashboard },
  { label: "Job Feed", href: "/worker/jobs", icon: Briefcase },
  { label: "Applications", href: "/worker/applications", icon: ClipboardList },
  { label: "Bookings", href: "/worker/bookings", icon: CalendarCheck },
  { label: "Reviews", href: "/worker/reviews", icon: Star },
  { label: "Profile", href: "/worker/profile", icon: User },
  { label: "Settings", href: "/worker/settings", icon: Settings },
];

export const providerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/provider/dashboard", icon: LayoutDashboard },
  { label: "My Jobs", href: "/provider/jobs", icon: Briefcase },
  { label: "Instant Hire", href: "/provider/instant-hire", icon: Zap },
  { label: "Applicants", href: "/provider/applicants", icon: Users },
  { label: "Bookings", href: "/provider/bookings", icon: CalendarCheck },
  { label: "Reviews", href: "/provider/reviews", icon: Star },
  { label: "Profile", href: "/provider/profile", icon: User },
  { label: "Settings", href: "/provider/settings", icon: Settings },
];

export const agentNavItems: NavItem[] = [
  { label: "Dashboard", href: "/agent/dashboard", icon: LayoutDashboard },
  { label: "Workers", href: "/agent/workers", icon: Users },
  { label: "Applications", href: "/agent/applications", icon: ClipboardList },
  { label: "Bookings", href: "/agent/bookings", icon: CalendarCheck },
  { label: "Profile", href: "/agent/profile", icon: UserCog },
  { label: "Settings", href: "/agent/settings", icon: Settings },
];

export const workerBottomNavItems: NavItem[] = [
  { label: "Home", href: "/worker/dashboard", icon: LayoutDashboard },
  { label: "Jobs", href: "/worker/jobs", icon: Briefcase },
  { label: "Bookings", href: "/worker/bookings", icon: CalendarCheck },
  { label: "Profile", href: "/worker/profile", icon: User },
];

export const providerBottomNavItems: NavItem[] = [
  { label: "Home", href: "/provider/dashboard", icon: LayoutDashboard },
  { label: "Jobs", href: "/provider/jobs", icon: Briefcase },
  { label: "Bookings", href: "/provider/bookings", icon: CalendarCheck },
  { label: "Profile", href: "/provider/profile", icon: User },
];

export const agentBottomNavItems: NavItem[] = [
  { label: "Home", href: "/agent/dashboard", icon: LayoutDashboard },
  { label: "Workers", href: "/agent/workers", icon: Users },
  { label: "Bookings", href: "/agent/bookings", icon: CalendarCheck },
  { label: "Profile", href: "/agent/profile", icon: UserCog },
];
