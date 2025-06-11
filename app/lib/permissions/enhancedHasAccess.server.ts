import { prisma } from "@db/db.server";
import {
  HierarchicalPermissionChecker,
  type PermissionContext,
} from "./hierarchical";
import { redirect } from "react-router";
import { getSession } from "~/lib/auth/auth.server";
import type { SessionUser } from "~/types/auth";

export async function hasAccessHierarchical(
  request: Request,
  requiredPermission?: string,
  targetReferenceId?: string,
): Promise<SessionUser> {
  const session = await getSession(request);
  const user = session?.user;

  if (!user) {
    throw redirect("/login");
  }

  if (!requiredPermission) {
    // no permission required for this route, just a valid user, return user
    return user;
  }

  // Load user's permissions and spaces in parallel
  const [userPermissionGroups, spaces] = await Promise.all([
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
    prisma.space.findMany({
      include: { agents: true },
    }),
  ]);

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
  const spaceAgentMap = new Map<string, string[]>();

  for (const space of spaces) {
    spaceAgentMap.set(
      space.id,
      space.agents.map((agent) => agent.id),
    );
  }

  // Check permission using hierarchical system
  const checker = new HierarchicalPermissionChecker(
    userPermissions,
    spaceAgentMap,
  );

  const hasPermission = checker.hasPermission(
    requiredPermission,
    targetReferenceId || "global",
  );

  if (!hasPermission) {
    throw new Response("Forbidden", { status: 403 });
  }

  return user;
}

// Utility function to check permissions without throwing
export async function checkPermissionHierarchical(
  request: Request,
  requiredPermission: string,
  targetReferenceId?: string,
): Promise<boolean> {
  try {
    await hasAccessHierarchical(request, requiredPermission, targetReferenceId);
    return true;
  } catch {
    return false;
  }
}

export const allowedSpacesToViewForUser = async (user: SessionUser) => {
  // Load user's permissions and spaces in parallel
  const [userPermissionGroups, spaces] = await Promise.all([
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
    prisma.space.findMany({
      include: { agents: true },
    }),
  ]);

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
  const spaceAgentMap = new Map<string, string[]>();
  for (const space of spaces) {
    spaceAgentMap.set(
      space.id,
      space.agents.map((agent) => agent.id),
    );
  }

  // Create hierarchical permission checker
  const checker = new HierarchicalPermissionChecker(
    userPermissions,
    spaceAgentMap,
  );

  // Filter spaces the user has permission to view
  const allowedSpaces = spaces.filter((space) => {
    // Check if user has permission to view this space
    // This covers space.view_space_settings, global.view_spaces, etc.
    return (
      checker.hasPermission("space.view_space_settings", space.id) ||
      checker.hasPermission("global.view_spaces", "global")
    );
  });

  return allowedSpaces.map((space) => space.id);
};

export const allowedAgentsInSpaceForUser = async (
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
  const spaceAgentMap = new Map<string, string[]>();
  spaceAgentMap.set(
    space.id,
    space.agents.map((agent) => agent.id),
  );

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

  return allowedAgents.map((agent) => agent.id);
};
