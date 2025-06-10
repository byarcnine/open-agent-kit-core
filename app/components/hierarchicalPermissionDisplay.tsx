import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ChevronDown, ChevronRight, Check, ArrowDown } from "react-feather";
import { useState } from "react";

interface Permission {
  scope: string;
  referenceId: string;
  inherited?: boolean;
  inheritedFrom?: string;
}

interface PermissionHierarchyDisplayProps {
  permissions: Permission[];
  title: string;
  context: "global" | "space" | "agent";
  referenceId: string;
  spaceName?: string;
  agentName?: string;
}

export const PermissionHierarchyDisplay = ({
  permissions,
  title,
  context,
  referenceId,
  spaceName,
  agentName,
}: PermissionHierarchyDisplayProps) => {
  const [showInherited, setShowInherited] = useState(false);

  const directPermissions = permissions.filter((p) => !p.inherited);
  const inheritedPermissions = permissions.filter((p) => p.inherited);

  const formatPermissionName = (scope: string) => {
    const [, permission] = scope.split(".");
    return permission
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getContextIcon = (context: string) => {
    switch (context) {
      case "global":
        return "🌐";
      case "space":
        return "🏢";
      case "agent":
        return "🤖";
      default:
        return "📋";
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{getContextIcon(context)}</span>
            <span>{title}</span>
            {spaceName && <Badge variant="outline">{spaceName}</Badge>}
            {agentName && <Badge variant="outline">{agentName}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{directPermissions.length} direct</Badge>
            {inheritedPermissions.length > 0 && (
              <Badge variant="outline">
                {inheritedPermissions.length} inherited
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Direct Permissions */}
        <div>
          <h4 className="font-medium text-sm text-muted-foreground mb-2">
            Direct Permissions
          </h4>
          {directPermissions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No direct permissions assigned
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {directPermissions.map((permission) => (
                <div
                  key={permission.scope}
                  className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200"
                >
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    {formatPermissionName(permission.scope)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inherited Permissions */}
        {inheritedPermissions.length > 0 && (
          <div>
            <button
              onClick={() => setShowInherited(!showInherited)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {showInherited ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Inherited Permissions ({inheritedPermissions.length})
            </button>

            {showInherited && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                {inheritedPermissions.map((permission) => (
                  <div
                    key={permission.scope}
                    className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200"
                  >
                    <ArrowDown className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">
                        {formatPermissionName(permission.scope)}
                      </span>
                      {permission.inheritedFrom && (
                        <div className="text-xs text-blue-600">
                          via {permission.inheritedFrom}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Permission Flow Visualization */}
        {context === "agent" &&
          (directPermissions.length > 0 || inheritedPermissions.length > 0) && (
            <div className="pt-3 border-t">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                Permission Flow
              </h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 bg-purple-100 rounded">Global</span>
                <ArrowDown className="h-3 w-3" />
                <span className="px-2 py-1 bg-blue-100 rounded">Space</span>
                <ArrowDown className="h-3 w-3" />
                <span className="px-2 py-1 bg-green-100 rounded font-medium">
                  Agent
                </span>
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
};

// Usage example component showing how effective permissions work
export const EffectivePermissionsExample = () => {
  const examplePermissions = [
    // Direct permissions
    { scope: "agent.chat", referenceId: "agent-123", inherited: false },

    // Inherited from space
    {
      scope: "agent.edit_agent",
      referenceId: "agent-123",
      inherited: true,
      inheritedFrom: "space.edit_space",
    },
    {
      scope: "agent.view_agent_settings",
      referenceId: "agent-123",
      inherited: true,
      inheritedFrom: "space.edit_space",
    },

    // Inherited from global
    {
      scope: "agent.chat",
      referenceId: "agent-123",
      inherited: true,
      inheritedFrom: "global.super_admin",
    },
  ];

  return (
    <div className="space-y-4">
      <PermissionHierarchyDisplay
        permissions={examplePermissions}
        title="Customer Support Agent"
        context="agent"
        referenceId="agent-123"
        spaceName="Customer Support"
        agentName="Support Bot"
      />
    </div>
  );
};
