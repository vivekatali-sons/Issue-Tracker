
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, List, Gauge, Cog, ClipboardList, Users, ArrowLeft, Menu, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

export const NAV_ITEMS = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Statuses", href: "/admin/statuses", icon: List },
  { title: "Severities", href: "/admin/severities", icon: Gauge },
  { title: "Processes", href: "/admin/processes", icon: Cog },
  { title: "Tasks", href: "/admin/tasks", icon: ClipboardList },
  { title: "Users", href: "/admin/users", icon: Users },
];

function SidebarBrand() {
  return (
    <Link to="/admin" className="flex items-center gap-3 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#d4af5a] to-[#b8942e] shadow-md shadow-[#d4af5a]/20">
        <Shield className="h-5 w-5 text-[#080e1a]" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold tracking-tight text-sidebar-accent-foreground">Admin Portal</span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground">Issue Tracker</span>
      </div>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();

  return (
    <>
      <nav className="flex-1 space-y-0.5 px-3 pt-4">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-sidebar-primary" />
              )}
              <Icon className={cn(
                "h-4 w-4 shrink-0 transition-colors",
                isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"
              )} />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-3 py-3">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to App
        </Link>
      </div>
    </>
  );
}

/** Desktop sidebar */
export function AdminSidebar() {
  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border/50 bg-sidebar backdrop-blur-xl">
      <div className="border-b border-sidebar-border">
        <SidebarBrand />
      </div>
      <NavLinks />
    </aside>
  );
}

/** Mobile hamburger + sheet */
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden text-sidebar-foreground hover:text-sidebar-accent-foreground">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0 flex flex-col bg-sidebar text-sidebar-foreground border-sidebar-border">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="border-b border-sidebar-border">
          <SidebarBrand />
        </div>
        <NavLinks onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
