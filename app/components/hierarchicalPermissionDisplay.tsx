import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ChevronDown, ChevronRight, Check, ArrowDown } from "react-feather";
import { useState } from "react";
import { Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

interface Permission {
  scope: string;
  referenceId: string;
  inherited?: boolean;
  inheritedFrom?: string;
}

interface AvailablePermission {
  key: string;
  name: string;
  description: string;
}

interface PermissionHierarchyDisplayProps {
  permissions: Permission[];
  title: string;
  context: "global" | "space" | "agent";
  referenceId: string;
  spaceName?: string;
  agentName?: string;
  // Editing props
  isEditing?: boolean;
  availablePermissions?: AvailablePermission[];
  onPermissionChange?: (
    permission: string,
    checked: boolean,
    referenceId: string,
  ) => void;
  checker?: {
    hasPermission: (permission: string, referenceId: string) => boolean;
    inheritedFrom: (
      permission: string,
      directPermissions: string[],
    ) => Array<{ name: string }>;
  };
}

export const PermissionHierarchyDisplay = ({
  permissions,
  title,
  context,
  referenceId,
  spaceName,
  agentName,
  availablePermissions = [],
  onPermissionChange,
  checker,
}: PermissionHierarchyDisplayProps) => {
  const [showInherited, setShowInherited] = useState(false);

  const directPermissions = permissions.filter((p) => !p.inherited);
  const inheritedPermissions = permissions.filter((p) => p.inherited);

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

  // For editing mode, get permission status using checker
  const getPermissionStatus = (permission: string) => {
    if (!checker)
      return {
        hasDirect: false,
        hasInherited: false,
        inheritedFrom: [],
        hasAny: false,
      };

    const directPermissionScopes = directPermissions.map((p) => p.scope);
    const hasDirect = directPermissionScopes.includes(permission);
    const hasInherited =
      !hasDirect && checker.hasPermission(permission, referenceId);
    const inheritedFrom = checker
      .inheritedFrom(permission, directPermissionScopes)
      .map((p) => p.name);

    return {
      hasDirect,
      hasInherited,
      inheritedFrom,
      hasAny: hasDirect || hasInherited,
    };
  };

  const inheritedAvailablePermissions = availablePermissions.filter((perm) => {
    const status = getPermissionStatus(perm.key);
    return status.hasInherited;
  });

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
        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="updatePermissions" />
          <input type="hidden" name="context" value={context} />
          <input type="hidden" name="referenceId" value={referenceId} />

          {/* Direct Permissions */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-3">
              Direct Permissions
            </h4>
            <div className="space-y-3">
              {availablePermissions.map((permission) => {
                const status = getPermissionStatus(permission.key);
                return (
                  <div
                    key={permission.key}
                    className="flex items-start space-x-3"
                  >
                    <input
                      type="checkbox"
                      id={`${context}-${referenceId}-${permission.key}`}
                      name="permissions"
                      value={permission.key}
                      checked={status.hasAny}
                      disabled={status.hasInherited && !status.hasDirect}
                      onChange={(e) =>
                        onPermissionChange?.(
                          permission.key,
                          e.target.checked,
                          referenceId,
                        )
                      }
                      className={`mt-1 rounded border ${
                        status.hasInherited && !status.hasDirect
                          ? "border-blue-300 bg-blue-50 text-blue-600"
                          : "border-gray-300"
                      }`}
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={`${context}-${referenceId}-${permission.key}`}
                        className={`cursor-pointer ${
                          status.hasDirect
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        <div className="font-medium">{permission.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {permission.description}
                        </div>
                      </Label>
                      {status.hasInherited && !status.hasDirect && (
                        <div className="flex items-center gap-1 mt-1">
                          <ArrowDown className="h-3 w-3 text-blue-600" />
                          <span className="text-xs text-blue-600">
                            Available via inheritance from{" "}
                            {status.inheritedFrom.join(", ")}.
                          </span>
                        </div>
                      )}
                    </div>
                    {status.hasAny && (
                      <Check
                        className={`h-4 w-4 ${
                          status.hasDirect ? "text-green-600" : "text-blue-600"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inherited Permissions */}
          {inheritedAvailablePermissions.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowInherited(!showInherited)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {showInherited ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Inherited Permissions ({inheritedAvailablePermissions.length})
              </button>

              {showInherited && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {inheritedAvailablePermissions.map((permission) => {
                    const status = getPermissionStatus(permission.key);
                    return (
                      <div
                        key={permission.key}
                        className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200"
                      >
                        <ArrowDown className="h-4 w-4 text-blue-600" />
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            {permission.name}
                          </span>
                          <div className="text-xs text-blue-600">
                            via {status.inheritedFrom.join(", ")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Permission Flow Visualization */}
          {context === "agent" && (
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

          <div className="pt-4 border-t">
            <Button type="submit">Update {title} Permissions</Button>
          </div>
        </Form>
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
