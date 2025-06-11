import { BookOpen, Cpu, Settings, Tool, User, Zap } from "react-feather";
import { cn } from "../../lib/utils";
import { Link, useLocation } from "react-router";
import type { SessionUser } from "../../types/auth";

export const OverviewNav = ({ user }: { user: SessionUser }) => {
  const location = useLocation();
  const canChangeGlobalSettings = user.role === "SUPER_ADMIN";
  return (
    <div className="flex flex-col justify-between flex-1 h-full">
      <nav className="grid gap-0.5 items-start md:px-2 text-sm">
        <Link
          to="/"
          prefetch="intent"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary truncate",
            {
              "bg-stone-900 text-white hover:text-white":
                location.pathname === "/",
            },
            {
              "hover:bg-stone-900/10": location.pathname !== "/",
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
              "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary truncate",
              {
                "bg-stone-900 text-white hover:text-white":
                  location.pathname === "/plugins",
              },
              {
                "hover:bg-stone-900/10": location.pathname !== "/plugins",
              },
            )}
          >
            <Tool className="h-4 w-4" />
            Agent Tools
          </Link>
        )}
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground pointer-events-none truncate",
          )}
        >
          <Cpu className="h-4 w-4" />
          Agent Templates
          <div className="text-xs rounded-md text-grey-600 overflow-hidden bg-gray-300 p-1 truncate">
            coming soon
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground pointer-events-none truncate",
          )}
        >
          <BookOpen className="h-4 w-4" />
          Knowledge
          <div className="text-xs rounded-md text-grey-600 overflow-hidden bg-gray-300 p-1 truncate">
            coming soon
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground pointer-events-none truncate",
          )}
        >
          <Zap className="h-4 w-4" />
          Workflows
          <div className="text-xs rounded-md text-grey-600 overflow-hidden bg-gray-300 p-1 truncate">
            coming soon
          </div>
        </div>
        <Link
          to="/permissions"
          prefetch="intent"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary truncate",
            {
              "bg-stone-900 text-white hover:text-white":
                location.pathname === "/permissions",
            },
            {
              "hover:bg-stone-900/10": location.pathname !== "/permissions",
            },
          )}
        >
          <User className="h-4 w-4" />
          Users & Permissions
        </Link>
      </nav>
      <nav className="md:px-2 text-sm mb-2">
        {canChangeGlobalSettings && (
          <Link
            to="/settings"
            prefetch="intent"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
              {
                "bg-stone-900 text-white hover:text-white":
                  location.pathname === "/settings",
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
