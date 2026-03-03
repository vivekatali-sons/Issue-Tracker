import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { AdminSidebar, AdminMobileNav, NAV_ITEMS } from "@/components/admin/admin-sidebar";
import { useTheme } from "@/hooks/use-theme";
import { Sun, Moon, LogOut, User, Search } from "lucide-react";

export function AdminLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    const storedUsername = sessionStorage.getItem("admin_username");
    if (token) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location.pathname !== "/admin/login") {
      navigate("/admin/login", { replace: true });
    }
  }, [isLoading, isAuthenticated, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const activeItem = NAV_ITEMS.find((item) =>
    item.href === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(item.href)
  );
  const pageTitle = activeItem?.title ?? "Administration";

  function handleLogout() {
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_username");
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header — off-white in light, dark in dark mode */}
        <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-muted/50 dark:bg-sidebar backdrop-blur-xl px-5 md:px-6 gap-3">
          {/* Subtle gradient accent line at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/20 dark:via-sidebar-primary/30 to-transparent" />

          <div className="flex items-center gap-3">
            <AdminMobileNav />
            <h1 className="text-base font-semibold tracking-tight text-foreground">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-1">
            {/* Search placeholder */}
            <button
              className="hidden md:flex h-8 items-center gap-2 rounded-lg border border-border/60 dark:border-sidebar-border bg-background/60 dark:bg-sidebar-accent/50 px-3 text-xs text-muted-foreground transition-colors hover:bg-accent dark:hover:bg-sidebar-accent hover:text-foreground dark:hover:text-sidebar-accent-foreground mr-2"
              onClick={() => {/* future search */}}
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search...</span>
              <kbd className="ml-3 rounded border border-border/60 dark:border-sidebar-border bg-background dark:bg-sidebar px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/60">/</kbd>
            </button>

            {/* User pill */}
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-accent/60 dark:bg-sidebar-accent/60 px-3 py-1.5 mr-1 border border-border/50 dark:border-sidebar-border/50">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 dark:bg-sidebar-primary/20">
                <User className="h-3 w-3 text-primary dark:text-sidebar-primary" />
              </div>
              <span className="text-xs font-medium text-foreground dark:text-sidebar-accent-foreground">{username}</span>
            </div>

            {/* Theme toggle */}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground dark:text-sidebar-foreground transition-all duration-200 hover:bg-accent dark:hover:bg-sidebar-accent hover:text-primary dark:hover:text-sidebar-primary"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Divider */}
            <div className="mx-1 h-5 w-px bg-border dark:bg-sidebar-border" />

            {/* Logout */}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground dark:text-sidebar-foreground transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
