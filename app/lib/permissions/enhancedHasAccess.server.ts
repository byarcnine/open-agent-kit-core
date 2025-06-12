import { prisma, type Permission } from "@db/db.server";
import { getAllPermissionsWithInheritance } from "./hierarchical";
import { redirect } from "react-router";
import { getSession } from "~/lib/auth/auth.server";
import type { SessionUser } from "~/types/auth";
import { AVAILABLE_PERMISSIONS } from "./permissions";

export const getUserScopes = async (user: SessionUser) => {
  return Object.keys(await getUserGrantedPermissions(user));
};

export type UserGrantedPermissions = {
  scope: keyof typeof AVAILABLE_PERMISSIONS;
  referenceId: string;
  direct: boolean;
}[];

export const resolvePermissionReferences = async (
  permissions: Partial<Permission>[],
) => {
  const allAgents = await prisma.agent.findMany({
    select: { id: true, spaceId: true },
  });

  const userGrantedPermissions: UserGrantedPermissions = [];
  for (const permission of permissions) {
    const scope = permission.scope as keyof typeof AVAILABLE_PERMISSIONS;
    if (scope.startsWith("global.")) {
      // get all inherited permissions for this scope and add an allAllowed true
      const inherited = getAllPermissionsWithInheritance([scope]);
      for (const inheritedPermission of inherited) {
        const inheritedScope =
          inheritedPermission as keyof typeof AVAILABLE_PERMISSIONS;
        if (inheritedPermission.startsWith("agent.")) {
          allAgents
            .map((agent) => agent.id)
            .forEach((agentId) => {
              userGrantedPermissions.push({
                scope: inheritedScope,
                referenceId: agentId,
                direct: inheritedPermission === scope,
              });
            });
        } else if (inheritedPermission.startsWith("space.")) {
          const spaceIds = new Set([
            ...allAgents.map((agent) => agent.spaceId),
          ]);
          spaceIds.forEach((spaceId) => {
            userGrantedPermissions.push({
              scope: inheritedScope,
              referenceId: spaceId,
              direct: inheritedPermission === scope,
            });
          });
        } else {
          userGrantedPermissions.push({
            scope: inheritedScope,
            referenceId: "global",
            direct: inheritedPermission === scope,
          });
        }
      }
    } else if (scope.startsWith("space.")) {
      // get all inherited permissions for this scope and add an allAllowed true
      const inherited = getAllPermissionsWithInheritance([scope]);
      const agentIdsInSpace = allAgents
        .filter((agent) => agent.spaceId === permission.referenceId)
        .map((agent) => agent.id);
      for (const inheritedPermission of inherited) {
        if (inheritedPermission.startsWith("agent.")) {
          const inheritedScope =
            inheritedPermission as keyof typeof AVAILABLE_PERMISSIONS;

          agentIdsInSpace.forEach((agentId) => {
            userGrantedPermissions.push({
              scope: inheritedScope,
              referenceId: agentId,
              direct: inheritedPermission === scope,
            });
          });
        }
        if (inheritedPermission.startsWith("space.")) {
          const inheritedScope =
            inheritedPermission as keyof typeof AVAILABLE_PERMISSIONS;

          userGrantedPermissions.push({
            scope: inheritedScope,
            referenceId: permission.referenceId as string,
            direct: inheritedPermission === scope,
          });
        }
      }
    } else if (scope.startsWith("agent.")) {
      // get all inherited permissions for this scope and add an allAllowed true
      const inherited = getAllPermissionsWithInheritance([scope]);
      for (const inheritedPermission of inherited) {
        const inheritedScope =
          inheritedPermission as keyof typeof AVAILABLE_PERMISSIONS;

        userGrantedPermissions.push({
          scope: inheritedScope,
          referenceId: permission.referenceId as string,
          direct: inheritedPermission === scope,
        });
      }
    }
  }
  return userGrantedPermissions;
};

export const getUserGrantedPermissions = async (
  user: SessionUser,
  groupId?: string, // allows to retrieve permissions that were granted by a specific group
): Promise<UserGrantedPermissions> => {
  const permissions = await prisma.permission.findMany({
    where: {
      permissionGroup: {
        ...(groupId && {
          id: groupId,
        }),
        userPermissionGroups: {
          some: { userId: user.id },
        },
      },
    },
  });
  return resolvePermissionReferences(permissions);
};

export const getGroupGrantedPermissions = async (
  groupId: string, // allows to retrieve permissions that were granted by a specific group
): Promise<UserGrantedPermissions> => {
  const permissions = await prisma.permission.findMany({
    where: {
      permissionGroupId: groupId,
    },
  });

  return resolvePermissionReferences(permissions);
};

export const hasAccessHierarchical = async (
  request: Request,
  requiredPermission?: string,
  targetReferenceId?: string,
) => {
  const session = await getSession(request);
  const user = session?.user;

  if (!user) {
    throw redirect("/auth/login");
  }

  // no permission required for this route, just a valid user, return user
  if (!requiredPermission) {
    return user;
  }

  const userGrantedPermissions = await getUserGrantedPermissions(user);
  if (
    !targetReferenceId &&
    userGrantedPermissions.some((p) => p.scope === requiredPermission)
  ) {
    return user;
  }
  if (
    targetReferenceId &&
    userGrantedPermissions.some(
      (p) =>
        p.scope === requiredPermission && p.referenceId === targetReferenceId,
    )
  ) {
    return user;
  }
  throw new Response("Forbidden", { status: 403 });
};

export const allowedAgentsToViewForUser = async (user: SessionUser) => {
  const userGrantedPermissions = await getUserGrantedPermissions(user);
  return userGrantedPermissions
    .filter((p) => p.scope === "agent.chat")
    .map((p) => p.referenceId);
};

export const allowedAgentsDetailsInSpaceForUser = async (
  user: SessionUser,
  spaceId: string,
) => {
  // Load user's permissions and the specific space with its agents in parallel
  const [userPermissionGroups, space] = await Promise.all([
    prisma.userPermissionGroup.findMany({
      where: { userId: user.id },
      include: {
        permissionGroup: {
          include: {
            permissions: true,
          },
        },
      },
    }),
    prisma.space.findUnique({
      where: { id: spaceId },
      include: { agents: true },
    }),
  ]);

  if (!space) {
    return [];
  }

  // Flatten permissions
  const userPermissions: PermissionContext[] = [];
  for (const upg of userPermissionGroups) {
    for (const permission of upg.permissionGroup.permissions) {
      userPermissions.push({
        scope: permission.scope,
        referenceId: permission.referenceId,
      });
    }
  }

  // Build space-agent mapping
  const spaceAgentMap = new Map<string, any[]>();
  spaceAgentMap.set(space.id, space.agents);

  // Create hierarchical permission checker
  const checker = new HierarchicalPermissionChecker(
    userPermissions,
    spaceAgentMap,
  );

  // Filter agents the user has permission to view
  const allowedAgents = space.agents.filter((agent) => {
    // Check if user has permission to view this agent
    // This covers agent.view_agent_settings, space.view_agents, global.view_spaces, etc.
    return (
      checker.hasPermission("agent.view_agent_settings", agent.id) ||
      checker.hasPermission("space.view_agents", spaceId) ||
      checker.hasPermission("global.view_spaces", "global")
    );
  });

  return allowedAgents;
};
