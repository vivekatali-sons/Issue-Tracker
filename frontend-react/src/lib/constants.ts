import type { NavItem } from "./types";

// ============================================================
// Navigation items for sidebar
// ============================================================
export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard",       href: "/dashboard",       icon: "LayoutDashboard" },
  { title: "All Issues",      href: "/issues",          icon: "List" },
  { title: "Open Issues",     href: "/open-issues",     icon: "AlertCircle" },
  { title: "Resolved Issues", href: "/resolved",        icon: "CheckCircle" },
];
