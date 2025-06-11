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
import { cn } from "~/lib/utils";
import { Link, useLocation } from "react-router";
import type { SessionUser } from "~/types/auth";

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
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all truncate ",
            {
              "bg-white text-primary": location.pathname === "/",
            },
            {
              "hover:bg-white/50": location.pathname !== "/",
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
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all  pointer-events-none truncate",
          )}
        >
          <Activity className="h-4 w-4" />
          Insights & Analytics
          <div className="text-xs rounded-xl text-grey-600 overflow-hidden bg-white/75 p-1 truncate">
            coming soon
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all  pointer-events-none truncate",
          )}
        >
          <DollarSign className="h-4 w-4" />
          Cost Control
          <div className="text-xs rounded-xl text-grey-600 overflow-hidden bg-white/75 p-1 truncate">
            coming soon
          </div>
        </div>
      </nav>
      <nav className="md:px-2 text-sm mb-2">
        {canChangeGlobalSettings && (
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
