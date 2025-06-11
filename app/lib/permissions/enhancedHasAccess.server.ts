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
  requiredPermission: string,
  targetReferenceId?: string,
): Promise<SessionUser> {
  const session = await getSession(request);
  const user = session?.user;

  if (!user) {
    throw redirect("/login");
  }

  // Load user's permissions
  const userPermissionGroups = await prisma.userPermissionGroup.findMany({
    where: { userId: user.id },
    include: {
      permissionGroup: {
        include: {
          permissions: true,
        },
      },
    },
  });

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
  const spaces = await prisma.space.findMany({
    include: { agents: true },
  });

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
