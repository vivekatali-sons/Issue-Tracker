
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { title: "Dashboard", href: "/admin" },
  { title: "Statuses", href: "/admin/statuses" },
  { title: "Severities", href: "/admin/severities" },
  { title: "Processes", href: "/admin/processes" },
  { title: "Tasks", href: "/admin/tasks" },
  { title: "Users", href: "/admin/users" },
  { title: "Permissions", href: "/admin/permissions" },
];

export function AdminSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="flex w-56 flex-col border-r bg-muted/30">
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/admin" className="text-lg font-semibold">
          Admin Portal
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-2">
        <Link
          to="/"
          className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Back to App
        </Link>
      </div>
    </aside>
  );
}
