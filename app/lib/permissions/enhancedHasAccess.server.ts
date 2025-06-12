import { prisma, type Permission } from "@db/db.server";
import {
  getAllPermissionsWithInheritance,
  // HierarchicalPermissionChecker,
  // type PermissionContext,
} from "./hierarchical";
import { redirect } from "react-router";
import { getSession } from "~/lib/auth/auth.server";
import type { SessionUser } from "~/types/auth";
import { AVAILABLE_PERMISSIONS } from "./permissions";

// export async function hasAccessHierarchical(
//   request: Request,
//   requiredPermission?: string,
//   targetReferenceId?: string,
// ): Promise<SessionUser> {
//   const session = await getSession(request);
//   const user = session?.user;

//   if (!user) {
//     throw redirect("/auth/login");
//   }

//   if (!requiredPermission) {
//     // no permission required for this route, just a valid user, return user
//     return user;
//   }

//   // Load user's permissions and spaces in parallel
//   const [userPermissionGroups, spaces] = await Promise.all([
//     prisma.userPermissionGroup.findMany({
//       where: { userId: user.id },
//       include: {
//         permissionGroup: {
//           include: {
//             permissions: true,
//           },
//         },
//       },
//     }),
//     prisma.space.findMany({
//       include: { agents: true },
//     }),
//   ]);

//   // Flatten permissions
//   const userPermissions: PermissionContext[] = [];
//   for (const upg of userPermissionGroups) {
//     for (const permission of upg.permissionGroup.permissions) {
//       userPermissions.push({
//         scope: permission.scope,
//         referenceId: permission.referenceId,
//       });
//     }
//   }

//   // Build space-agent mapping
//   const spaceAgentMap = new Map<string, string[]>();

//   for (const space of spaces) {
//     spaceAgentMap.set(
//       space.id,
//       space.agents.map((agent) => agent.id),
//     );
//   }

//   // Check permission using hierarchical system
//   const checker = new HierarchicalPermissionChecker(
//     userPermissions,
//     spaceAgentMap,
//   );

//   const hasPermission = checker.hasPermission(
//     requiredPermission,
//     targetReferenceId || "global",
//   );

//   if (!hasPermission) {
//     throw new Response("Forbidden", { status: 403 });
//   }

//   return user;
// }

// // Utility function to check permissions without throwing
// export async function checkPermissionHierarchical(
//   request: Request,
//   requiredPermission: string,
//   targetReferenceId?: string,
// ): Promise<boolean> {
//   try {
//     await hasAccessHierarchical(request, requiredPermission, targetReferenceId);
//     return true;
//   } catch {
//     return false;
//   }
// }

// export const allowedSpacesToViewForUser = async (user: SessionUser) => {
//   // Load user's permissions and spaces in parallel
//   const [userPermissionGroups, spaces] = await Promise.all([
//     prisma.userPermissionGroup.findMany({
//       where: { userId: user.id },
//       include: {
//         permissionGroup: {
//           include: {
//             permissions: true,
//           },
//         },
//       },
//     }),
//     prisma.space.findMany({
//       include: { agents: true },
//     }),
//   ]);

//   // Flatten permissions
//   const userPermissions: PermissionContext[] = [];
//   for (const upg of userPermissionGroups) {
//     for (const permission of upg.permissionGroup.permissions) {
//       userPermissions.push({
//         scope: permission.scope,
//         referenceId: permission.referenceId,
//       });
//     }
//   }

//   // Build space-agent mapping
//   const spaceAgentMap = new Map<string, string[]>();
//   for (const space of spaces) {
//     spaceAgentMap.set(
//       space.id,
//       space.agents.map((agent) => agent.id),
//     );
//   }

//   // Create hierarchical permission checker
//   const checker = new HierarchicalPermissionChecker(
//     userPermissions,
//     spaceAgentMap,
//   );

//   // Filter spaces the user has permission to view
//   const allowedSpaces = spaces.filter((space) => {
//     // Check if user has permission to view this space
//     // This covers space.view_space_settings, global.view_spaces, etc.
//     return (
//       checker.hasPermission("space.view_space_settings", space.id) ||
//       checker.hasPermission("global.view_spaces", "global")
//     );
//   });

//   return allowedSpaces.map((space) => space.id);
// };

// export const allowedAgentsInSpaceForUser = async (
//   user: SessionUser,
//   spaceId: string,
// ) => {
//   // Load user's permissions and the specific space with its agents in parallel
//   const [userPermissionGroups, space] = await Promise.all([
//     prisma.userPermissionGroup.findMany({
//       where: { userId: user.id },
//       include: {
//         permissionGroup: {
//           include: {
//             permissions: true,
//           },
//         },
//       },
//     }),
//     prisma.space.findUnique({
//       where: { id: spaceId },
//       include: { agents: true },
//     }),
//   ]);

//   if (!space) {
//     return [];
//   }

//   // Flatten permissions
//   const userPermissions: PermissionContext[] = [];
//   for (const upg of userPermissionGroups) {
//     for (const permission of upg.permissionGroup.permissions) {
//       userPermissions.push({
//         scope: permission.scope,
//         referenceId: permission.referenceId,
//       });
//     }
//   }

//   // Build space-agent mapping
//   const spaceAgentMap = new Map<string, string[]>();
//   spaceAgentMap.set(
//     space.id,
//     space.agents.map((agent) => agent.id),
//   );

//   // Create hierarchical permission checker
//   const checker = new HierarchicalPermissionChecker(
//     userPermissions,
//     spaceAgentMap,
//   );

//   // Filter agents the user has permission to view
//   const allowedAgents = space.agents.filter((agent) => {
//     // Check if user has permission to view this agent
//     // This covers agent.view_agent_settings, space.view_agents, global.view_spaces, etc.
//     return (
//       checker.hasPermission("agent.view_agent_settings", agent.id) ||
//       checker.hasPermission("space.view_agents", spaceId) ||
//       checker.hasPermission("global.view_spaces", "global")
//     );
//   });

//   return allowedAgents.map((agent) => agent.id);
// };

export const getUserScopes = async (user: SessionUser) => {
  return Object.keys(await getUserGrantedPermissions(user));
};

type UserGrantedPermissions = Partial<{
  [K in keyof typeof AVAILABLE_PERMISSIONS]: {
    allAllowed: boolean;
    referenceIds: string[];
    direct: boolean;
  };
}>;

const resolvePermissionReferences = async (permissions: Permission[]) => {
  const allAgents = await prisma.agent.findMany({
    select: { id: true, spaceId: true },
  });

  const userGrantedPermissions: UserGrantedPermissions = {};
  for (const permission of permissions) {
    const scope = permission.scope as keyof UserGrantedPermissions;
    if (scope.startsWith("global.")) {
      // get all inherited permissions for this scope and add an allAllowed true
      const inherited = getAllPermissionsWithInheritance([scope]);
      for (const inheritedPermission of inherited) {
        const inheritedScope =
          inheritedPermission as keyof UserGrantedPermissions;
        if (!userGrantedPermissions[inheritedScope]) {
          userGrantedPermissions[inheritedScope] = {
            allAllowed: true,
            referenceIds: [],
            direct: inheritedPermission === scope,
          };
        } else {
          userGrantedPermissions[inheritedScope].allAllowed = true;
          if (inheritedPermission === scope) {
            userGrantedPermissions[inheritedScope].direct = true;
          }
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
            inheritedPermission as keyof UserGrantedPermissions;
          if (!userGrantedPermissions[inheritedScope]) {
            userGrantedPermissions[inheritedScope] = {
              allAllowed: false,
              referenceIds: agentIdsInSpace,
              direct: inheritedPermission === scope,
            };
          } else {
            userGrantedPermissions[inheritedScope].referenceIds = Array.from(
              new Set([
                ...userGrantedPermissions[inheritedScope].referenceIds,
                ...agentIdsInSpace,
              ]),
            );
            if (inheritedPermission === scope) {
              userGrantedPermissions[inheritedScope].direct = true;
            }
          }
        }
        if (inheritedPermission.startsWith("space.")) {
          const inheritedScope =
            inheritedPermission as keyof UserGrantedPermissions;
          if (!userGrantedPermissions[inheritedScope]) {
            userGrantedPermissions[inheritedScope] = {
              allAllowed: false,
              referenceIds: [permission.referenceId],
              direct: inheritedPermission === scope,
            };
          } else {
            userGrantedPermissions[inheritedScope].referenceIds = Array.from(
              new Set([
                ...userGrantedPermissions[inheritedScope].referenceIds,
                permission.referenceId,
              ]),
            );
            if (inheritedPermission === scope) {
              userGrantedPermissions[inheritedScope].direct = true;
            }
          }
        }
      }
    } else if (scope.startsWith("agent.")) {
      // get all inherited permissions for this scope and add an allAllowed true
      const inherited = getAllPermissionsWithInheritance([scope]);
      for (const inheritedPermission of inherited) {
        const inheritedScope =
          inheritedPermission as keyof UserGrantedPermissions;
        if (!userGrantedPermissions[inheritedScope]) {
          userGrantedPermissions[inheritedScope] = {
            allAllowed: false,
            referenceIds: [permission.referenceId],
            direct: inheritedPermission === scope,
          };
        } else {
          userGrantedPermissions[inheritedScope].referenceIds.push(
            permission.referenceId,
          );
          if (inheritedPermission === scope) {
            userGrantedPermissions[inheritedScope].direct = true;
          }
        }
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
    userGrantedPermissions[requiredPermission as keyof UserGrantedPermissions]
      ?.allAllowed
  ) {
    return user;
  }
  if (
    targetReferenceId &&
    userGrantedPermissions[
      requiredPermission as keyof UserGrantedPermissions
    ]?.referenceIds.includes(targetReferenceId)
  ) {
    return user;
  }
  throw new Response("Forbidden", { status: 403 });
};

export const allowedAgentsToViewForUser = async (
  user: SessionUser,
  spaceId?: string,
) => {
  const userGrantedPermissions = await getUserGrantedPermissions(user);
  if (userGrantedPermissions["agent.chat"]) {
    if (userGrantedPermissions["agent.chat"].allAllowed) {
      const allAgentIds = await prisma.agent.findMany({
        select: { id: true, spaceId: true },
        where: {
          spaceId: spaceId,
        },
      });
      return allAgentIds.map((agent) => agent.id);
    }
    if (spaceId) {
      const agentIdsInSpace = await prisma.agent.findMany({
        select: { id: true },
        where: {
          spaceId: spaceId,
        },
      });
      const agentIdsInSpaceMap = agentIdsInSpace.map((agent) => agent.id);
      return userGrantedPermissions["agent.chat"].referenceIds.filter((id) =>
        agentIdsInSpaceMap.includes(id),
      );
    }
    return userGrantedPermissions["agent.chat"].referenceIds;
  }
};
export const allowedSpacesToViewForUser = async (user: SessionUser) => {
  const userGrantedPermissions = await getUserGrantedPermissions(user);
  if (userGrantedPermissions["agent.chat"]) {
    if (userGrantedPermissions["agent.chat"].allAllowed) {
      const allSpaces = await prisma.space.findMany({
        select: { id: true },
      });
      return allSpaces.map((space) => space.id);
    } else {
      const allowedAgents = userGrantedPermissions["agent.chat"].referenceIds;
      const allowedSpaces = await prisma.space.findMany({
        select: { id: true },
        where: {
          agents: {
            some: { id: { in: allowedAgents } },
          },
        },
      });
      return allowedSpaces.map((space) => space.id);
    }
  }
};
