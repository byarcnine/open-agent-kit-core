import { cn } from "../../lib/utils";
import {
  Activity,
  BookOpen,
  Cpu,
  DollarSign,
  Settings,
  Tool,
  User,
  Zap,
} from "react-feather";
import { Link, useLocation } from "react-router";
import type { UserGrantedPermissions } from "~/lib/permissions/enhancedHasAccess.server";

export const OverviewNav = ({
  userScopes,
}: {
  userScopes: UserGrantedPermissions;
}) => {
  const location = useLocation();
  return (
    <div className="flex flex-col justify-between flex-1 h-full">
      <nav className="grid gap-0.5 items-start md:px-2 text-sm">
        <Link
          to="/"
          prefetch="intent"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all truncate ",
            {
              "bg-white text-primary":
                location.pathname === "/" ||
                location.pathname.includes("/space/"),
            },
            {
              "hover:bg-white/50":
                location.pathname !== "/" &&
                !location.pathname.includes("/space/"),
            },
          )}
        >
          <User className="h-4 w-4" />
          My Spaces
        </Link>
        {userScopes.some((p) => p.scope === "global.edit_plugins") && (
          <Link
            to="/plugins"
            prefetch="intent"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 transition-all  truncate",
              {
                "bg-white text-primary": location.pathname === "/plugins",
              },
              {
                "hover:bg-white/50": location.pathname !== "/plugins",
              },
            )}
          >
            <Tool className="h-4 w-4" />
            Agent Tools
          </Link>
        )}
        <Link
          to="/cost-control"
          prefetch="intent"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all  truncate",
            {
              "bg-white text-primary": location.pathname === "/cost-control",
            },
            {
              "hover:bg-white/50": location.pathname !== "/cost-control",
            },
          )}
        >
          <DollarSign className="h-4 w-4" />
          Cost Control
        </Link>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all  pointer-events-none truncate",
          )}
        >
          <Cpu className="h-4 w-4" />
          Agent Templates
          <div className="text-xs rounded-xl text-grey-600 overflow-hidden bg-white/75 p-1 truncate">
            coming soon
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all  pointer-events-none truncate",
          )}
        >
          <BookOpen className="h-4 w-4" />
          Knowledge
          <div className="text-xs rounded-xl text-grey-600 overflow-hidden bg-white/75 p-1 truncate">
            coming soon
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all  pointer-events-none truncate",
          )}
        >
          <Zap className="h-4 w-4" />
          Workflows
          <div className="text-xs rounded-xl text-grey-600 overflow-hidden bg-white/75 p-1 truncate">
            coming soon
          </div>
        </div>
        <Link
          to="/analytics"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all truncate",
            {
              "bg-white text-primary": location.pathname === "/analytics",
            },
            {
              "hover:bg-white/50": location.pathname !== "/analytics",
            },
          )}
        >
          <Activity className="h-4 w-4" />
          Insights & Analytics
        </Link>

        {userScopes.some((p) => p.scope === "global.edit_global_users") && (
          <Link
            to="/permissions"
            prefetch="intent"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 transition-all truncate",
              {
                "bg-white text-primary": location.pathname === "/permissions",
              },
              {
                "hover:bg-white/50": location.pathname !== "/permissions",
              },
            )}
          >
            <User className="h-4 w-4" />
            Users & Permissions
          </Link>
        )}
      </nav>
      <nav className="md:px-2 text-sm mb-2">
        {userScopes.some((p) => p.scope === "global.super_admin") && (
          <Link
            to="/settings"
            prefetch="intent"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 transition-all ",
              {
                "bg-white text-primary": location.pathname === "/settings",
              },
              {
                "hover:bg-white/50": location.pathname !== "/settings",
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
