// Hierarchical permission resolution system
import { AVAILABLE_PERMISSIONS } from "./permissions";

// Helper function to get grants for a permission
function getPermissionGrants(permission: string): string[] {
  // The permission parameter is the full permission key (e.g., "global.super_admin")
  // The AVAILABLE_PERMISSIONS is flat, not nested by scope
  const permissionConfig =
    AVAILABLE_PERMISSIONS[permission as keyof typeof AVAILABLE_PERMISSIONS];

  if (!permissionConfig) return [];

  return permissionConfig.grants || [];
}

export interface PermissionContext {
  scope: string;
  referenceId: string;
  spaceId?: string; // For agents, which space they belong to
}

export class HierarchicalPermissionChecker {
  private userPermissions: PermissionContext[];
  private spaceAgentMap: Map<string, string[]>; // spaceId -> agentIds

  constructor(
    userPermissions: PermissionContext[],
    spaceAgentMap: Map<string, string[]>,
  ) {
    this.userPermissions = userPermissions;
    this.spaceAgentMap = spaceAgentMap;
  }

  hasPermission(requiredScope: string, targetReferenceId: string): boolean {
    // 1. Check direct permission
    if (this.hasDirectPermission(requiredScope, targetReferenceId)) {
      return true;
    }

    // 2. Check inherited permissions
    return this.hasInheritedPermission(requiredScope, targetReferenceId);
  }

  inheritedFrom(scope: string, userPermissions: string[]) {
    return Object.entries(AVAILABLE_PERMISSIONS)
      .map(([key, permission]) => {
        if (!userPermissions.includes(key)) {
          return undefined;
        }
        if (this.matchesPermissionPattern(scope, permission.grants)) {
          return permission;
        }
      })
      .filter((p) => p !== undefined);
  }

  private hasDirectPermission(scope: string, referenceId: string): boolean {
    return this.userPermissions.some(
      (p) => p.scope === scope && p.referenceId === referenceId,
    );
  }

  private hasInheritedPermission(
    requiredScope: string,
    targetReferenceId: string,
  ): boolean {
    const [context] = requiredScope.split(".");

    // Check if any user permission grants the required permission
    for (const userPerm of this.userPermissions) {
      if (
        this.permissionGrantsRequired(
          userPerm,
          requiredScope,
          targetReferenceId,
          context,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  private permissionGrantsRequired(
    userPerm: PermissionContext,
    requiredScope: string,
    targetReferenceId: string,
    context: string,
  ): boolean {
    const inheritedPerms = getPermissionGrants(userPerm.scope);

    if (!this.matchesPermissionPattern(requiredScope, inheritedPerms)) {
      return false;
    }

    // Check if this permission applies to the target
    return this.permissionAppliesToTarget(userPerm, targetReferenceId, context);
  }

  private permissionAppliesToTarget(
    userPerm: PermissionContext,
    targetReferenceId: string,
    context: string,
  ): boolean {
    const [userContext] = userPerm.scope.split(".");

    // Global permissions apply everywhere
    if (userContext === "global") {
      return true;
    }

    // Direct match
    if (userPerm.referenceId === targetReferenceId) {
      return true;
    }

    // Space permissions apply to agents in that space
    if (userContext === "space" && context === "agent") {
      const agentsInSpace = this.spaceAgentMap.get(userPerm.referenceId) || [];
      return agentsInSpace.includes(targetReferenceId);
    }

    // Agent permissions apply to their space
    if (userContext === "agent" && context === "space") {
      const agentSpaceId = this.getSpaceForAgent(userPerm.referenceId);
      return agentSpaceId === targetReferenceId;
    }

    return false;
  }

  private matchesPermissionPattern(
    requiredScope: string,
    patterns: string[],
  ): boolean {
    return patterns.some((pattern) => {
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        return requiredScope.startsWith(prefix);
      }
      return pattern === requiredScope;
    });
  }

  private getSpaceForAgent(agentId: string): string | null {
    for (const [spaceId, agentIds] of this.spaceAgentMap.entries()) {
      if (agentIds.includes(agentId)) {
        return spaceId;
      }
    }
    return null;
  }

  // Get all effective permissions for debugging/display
  getAllEffectivePermissions(): PermissionContext[] {
    const effective: PermissionContext[] = [...this.userPermissions];

    // Add inherited permissions
    for (const userPerm of this.userPermissions) {
      if (userPerm.scope.startsWith("global.")) {
        // Global permissions apply everywhere
        const inheritedPerms = getPermissionGrants(userPerm.scope);

        // Add to all spaces and agents
        // This would need to be expanded based on actual spaces/agents
      }

      if (userPerm.scope.startsWith("space.")) {
        // Space permissions apply to agents in that space
        const inheritedPerms = getPermissionGrants(userPerm.scope);
        const agentIds = this.spaceAgentMap.get(userPerm.referenceId) || [];

        for (const agentId of agentIds) {
          for (const inheritedPerm of inheritedPerms) {
            if (
              !effective.some(
                (p) => p.scope === inheritedPerm && p.referenceId === agentId,
              )
            ) {
              effective.push({
                scope: inheritedPerm,
                referenceId: agentId,
                spaceId: userPerm.referenceId,
              });
            }
          }
        }
      }
    }

    return effective;
  }
}
