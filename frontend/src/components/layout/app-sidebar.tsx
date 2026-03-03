
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  List,
  AlertCircle,
  CheckCircle,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { NAV_ITEMS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  List,
  AlertCircle,
  CheckCircle,
};

export function AppSidebar() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      {/* Branded header — logo + company name */}
      <SidebarHeader className="h-14 border-b border-sidebar-border pl-[22px] pr-3 flex flex-row items-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center transition-all duration-200">
        <Link to="/dashboard" className="flex items-center gap-2" onClick={handleNavClick}>
          <img
            src="/logo-icon.svg"
            alt="Ali & Sons"
            width={28}
            height={28}
            className="shrink-0"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight text-sidebar-accent-foreground">
              Ali & Sons
            </span>
            <span className="text-[11px] font-medium text-sidebar-foreground/60">
              Issue Tracker
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 group-data-[collapsible=icon]:px-1">
        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const Icon = ICON_MAP[item.icon];
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <SidebarMenuItem key={item.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          className={
                            isActive
                              ? "border-l-2 border-gold bg-sidebar-accent/60 text-sidebar-accent-foreground font-medium group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:mx-auto"
                              : "border-l-2 border-transparent text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 transition-colors duration-150 group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:mx-auto"
                          }
                        >
                          <Link to={item.href} onClick={handleNavClick}>
                            {Icon && <Icon className="h-4 w-4 shrink-0" />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right" className="font-medium">
                          {item.title}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  onClick={() => { handleNavClick(); logout(); }}
                  className="border-l-2 border-transparent text-sidebar-foreground/60 hover:text-red-400 hover:bg-sidebar-accent/30 transition-colors duration-150 cursor-pointer group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:mx-auto"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="font-medium">
                  Logout
                </TooltipContent>
              )}
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
