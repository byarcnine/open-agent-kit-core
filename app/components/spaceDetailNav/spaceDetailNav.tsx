import { cn } from "../../lib/utils";
import { Settings, Tool, User } from "react-feather";
import { Link, useLocation } from "react-router";
import { PERMISSION } from "~/lib/permissions/permissions";

export const SpaceDetailNav = ({
  userScopes,
  spaceId,
}: {
  userScopes: string[];
  spaceId: string;
}) => {
  const location = useLocation();
  return (
    <div className="flex flex-col justify-between flex-1 h-full">
      <nav className="grid gap-0.5 items-start md:px-2 text-sm">
        <Link
          to={`/space/${spaceId}`}
          prefetch="intent"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all truncate ",
            {
              "bg-white text-primary":
                location.pathname === `/space/${spaceId}`,
            },
            {
              "hover:bg-white/50": location.pathname !== `/space/${spaceId}`,
            },
          )}
        >
          <User className="h-4 w-4" />
          My Agents
        </Link>
        {/* {userScopes.includes(PERMISSION["global.edit_plugins"]) && (
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
        )} */}
        {userScopes.includes(PERMISSION["global.edit_global_users"]) && (
          <Link
            to={`/space/${spaceId}/permissions`}
            prefetch="intent"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 transition-all truncate",
              {
                "bg-white text-primary": location.pathname.includes(
                  `/space/${spaceId}/permissions`,
                ),
              },
              {
                "hover:bg-white/50": !location.pathname.includes(
                  `/space/${spaceId}/permissions`,
                ),
              },
            )}
          >
            <User className="h-4 w-4" />
            Users & Permissions
          </Link>
        )}
      </nav>
    </div>
  );
};
