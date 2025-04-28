import { Settings, Tool, User } from "react-feather";
import { cn } from "~/lib/utils";
import { Link, useLocation } from "react-router";
import type { SessionUser } from "~/types/auth";

export const OverviewNav = ({ user }: { user: SessionUser }) => {
  const location = useLocation();
  const canChangeGlobalSettings = user.role === "SUPER_ADMIN";
  return (
    <div className="flex flex-col justify-between flex-1 h-full">
      <nav className="grid items-start md:px-2 text-sm font-medium">
        <Link
          to="/"
          prefetch="intent"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
            {
              "bg-zinc-200 text-primary": location.pathname === "/",
            },
          )}
        >
          <User className="h-4 w-4" />
          My Agents
        </Link>

        {canChangeGlobalSettings && (
          <Link
            to="/plugins"
            prefetch="intent"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
              {
                "bg-zinc-200 text-primary": location.pathname === "/plugins",
              },
            )}
          >
            <Tool className="h-4 w-4" />
            Tools & Plugins
          </Link>
        )}
      </nav>
      <nav className="md:px-2 text-sm font-medium mb-2">
        {canChangeGlobalSettings && (
          <Link
            to="/settings"
            prefetch="intent"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
              {
                "bg-zinc-200 text-primary": location.pathname === "/settings",
              },
            )}
          >
            <Settings className="h-4 w-4" />
            Global Settings
          </Link>
        )}
      </nav>
    </div>
  );
};
