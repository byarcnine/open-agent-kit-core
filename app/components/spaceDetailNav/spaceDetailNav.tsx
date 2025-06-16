import { cn } from "../../lib/utils";
import { Settings, Tool, User } from "react-feather";
import { Link, useLocation } from "react-router";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { Space } from "@prisma/client";
import type { UserGrantedPermissions } from "~/lib/permissions/enhancedHasAccess.server";

export const SpaceDetailNav = ({
  userScopes,
  space,
}: {
  userScopes: UserGrantedPermissions;
  space: Space;
}) => {
  const location = useLocation();
  return (
    <div className="flex flex-col justify-between flex-1 h-full">
      <nav className="grid gap-0.5 items-start md:px-2 text-sm">
        <Link
          to={`/space/${space.id}`}
          prefetch="intent"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all truncate ",
            {
              "bg-white text-primary":
                location.pathname === `/space/${space.id}`,
            },
            {
              "hover:bg-white/50": location.pathname !== `/space/${space.id}`,
            },
          )}
        >
          <User className="h-4 w-4" />
          {space.name} Agents
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
        {userScopes.some(
          (p) => p.scope === "space.edit_users" && p.referenceId === space.id,
        ) && (
          <Link
            to={`/space/${space.id}/permissions`}
            prefetch="intent"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 transition-all truncate",
              {
                "bg-white text-primary": location.pathname.includes(
                  `/space/${space.id}/permissions`,
                ),
              },
              {
                "hover:bg-white/50": !location.pathname.includes(
                  `/space/${space.id}/permissions`,
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
