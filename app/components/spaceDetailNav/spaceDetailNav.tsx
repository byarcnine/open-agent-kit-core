import { cn } from "../../lib/utils";
import { Box, Cpu, Settings, User } from "react-feather";
import { Link, useLocation } from "react-router";
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
          <Box className="h-4 w-4" />
          {space.name} Agents
        </Link>
        <Link
          to={`/space/${space.id}/invent-agent`}
          prefetch="intent"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all truncate ",
            {
              "bg-white text-primary": location.pathname.includes(
                `/space/${space.id}/invent-agent`,
              ),
            },
            {
              "hover:bg-white/50": !location.pathname.includes(
                `/space/${space.id}/invent-agent`,
              ),
            },
          )}
        >
          <Cpu className="h-4 w-4" />
          Agent Inventor
        </Link>

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
        {userScopes.some(
          (p) => p.scope === "space.edit_space" && p.referenceId === space.id,
        ) && (
          <Link
            to={`/space/${space.id}/settings`}
            prefetch="intent"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 transition-all truncate",
              {
                "bg-white text-primary": location.pathname.includes(
                  `/space/${space.id}/settings`,
                ),
              },
              {
                "hover:bg-white/50": !location.pathname.includes(
                  `/space/${space.id}/settings`,
                ),
              },
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        )}
      </nav>
    </div>
  );
};
