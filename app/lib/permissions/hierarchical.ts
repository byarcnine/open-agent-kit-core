// Hierarchical permission resolution system
import { AVAILABLE_PERMISSIONS } from "./permissions";

// Helper function to get grants for a permission
function getPermissionGrants(scope: string, permission: string): string[] {
  const scopePermissions =
    AVAILABLE_PERMISSIONS[scope as keyof typeof AVAILABLE_PERMISSIONS];
  if (!scopePermissions) return [];

  // Find the permission in the scope using Object.entries for type safety
  const permissionEntry = Object.entries(scopePermissions).find(
    ([key]) => key === permission,
  );

  if (!permissionEntry) return [];

  const [, permissionConfig] = permissionEntry;

  // Check if this permission has grants
  if (!("grants" in permissionConfig) || !permissionConfig.grants) {
    return [];
  }

  return permissionConfig.grants;
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

  private hasDirectPermission(scope: string, referenceId: string): boolean {
    return this.userPermissions.some(
      (p) => p.scope === scope && p.referenceId === referenceId,
    );
  }

  private hasInheritedPermission(
    requiredScope: string,
    targetReferenceId: string,
  ): boolean {
    const [context, permission] = requiredScope.split(".");

    // Check global permissions first
    for (const userPerm of this.userPermissions) {
      if (userPerm.scope.startsWith("global.")) {
        const inheritedPerms = getPermissionGrants("global", userPerm.scope);

        if (this.matchesPermissionPattern(requiredScope, inheritedPerms)) {
          return true;
        }
      }
    }

    // If checking space permission, check space permissions for inheritance
    if (context === "space") {
      for (const userPerm of this.userPermissions) {
        if (
          userPerm.scope.startsWith("space.") &&
          userPerm.referenceId === targetReferenceId
        ) {
          const inheritedPerms = getPermissionGrants("space", userPerm.scope);

          if (this.matchesPermissionPattern(requiredScope, inheritedPerms)) {
            return true;
          }
        }
      }

      // Check if agent permissions in this space grant space permissions
      const agentsInSpace = this.spaceAgentMap.get(targetReferenceId) || [];
      for (const userPerm of this.userPermissions) {
        if (
          userPerm.scope.startsWith("agent.") &&
          agentsInSpace.includes(userPerm.referenceId)
        ) {
          const inheritedPerms = getPermissionGrants("agent", userPerm.scope);

          if (this.matchesPermissionPattern(requiredScope, inheritedPerms)) {
            return true;
          }
        }
      }
    }

    // If checking agent permission, check space permissions
    if (context === "agent") {
      const agentSpaceId = this.getSpaceForAgent(targetReferenceId);
      if (agentSpaceId) {
        for (const userPerm of this.userPermissions) {
          if (
            userPerm.scope.startsWith("space.") &&
            userPerm.referenceId === agentSpaceId
          ) {
            const inheritedPerms = getPermissionGrants("space", userPerm.scope);

            if (this.matchesPermissionPattern(requiredScope, inheritedPerms)) {
              return true;
            }
          }
        }
      }
    }

    // Check same-level inheritance for both space and agent permissions
    if (context === "space") {
      for (const userPerm of this.userPermissions) {
        if (
          userPerm.scope.startsWith("space.") &&
          userPerm.referenceId === targetReferenceId
        ) {
          const inheritedPerms = getPermissionGrants("space", userPerm.scope);

          if (inheritedPerms.includes(requiredScope)) {
            return true;
          }
        }
      }
    }

    if (context === "agent") {
      // Check agent permissions for same agent
      for (const userPerm of this.userPermissions) {
        if (
          userPerm.scope.startsWith("agent.") &&
          userPerm.referenceId === targetReferenceId
        ) {
          const inheritedPerms = getPermissionGrants("agent", userPerm.scope);

          if (inheritedPerms.includes(requiredScope)) {
            return true;
          }
        }
      }
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
        const inheritedPerms = getPermissionGrants("global", userPerm.scope);

        // Add to all spaces and agents
        // This would need to be expanded based on actual spaces/agents
      }

      if (userPerm.scope.startsWith("space.")) {
        // Space permissions apply to agents in that space
        const inheritedPerms = getPermissionGrants("space", userPerm.scope);
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
