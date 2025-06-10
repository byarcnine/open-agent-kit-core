import {
  useLoaderData,
  useActionData,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  Link,
} from "react-router";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import { PERMISSIONS, type SessionUser } from "~/types/auth";
import { prisma } from "@db/db.server";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  ArrowLeft,
  Users,
  Shield,
  ChevronDown,
  ChevronRight,
} from "react-feather";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { Label } from "~/components/ui/label";
import {
  HierarchicalPermissionChecker,
  type PermissionContext,
} from "~/lib/permissions/hierarchical";
import { Badge } from "~/components/ui/badge";
import { Check, ArrowDown, Info } from "react-feather";
import { AVAILABLE_PERMISSIONS } from "~/lib/permissions/permissions";

type ActionData = {
  success: boolean;
  error?: string;
  message?: string;
  intent: string;
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const groupId = params.groupId as string;
  const formData = await request.formData();
  await hasAccess(request, PERMISSIONS.EDIT_GLOBAL_SETTINGS);
  const intent = formData.get("intent");

  switch (intent) {
    case "updatePermissions": {
      const permissions = formData.getAll("permissions") as string[];
      const context = formData.get("context") as string;
      const referenceId = formData.get("referenceId") as string;

      try {
        // Remove existing permissions for this context
        let whereClause: any = { permissionGroupId: groupId };

        if (context === "global") {
          whereClause.scope = { startsWith: "global." };
          whereClause.referenceId = "global";
        } else if (context === "space") {
          whereClause.referenceId = referenceId;
          whereClause.scope = { startsWith: "space." };
        } else if (context === "agent") {
          whereClause.referenceId = referenceId;
          whereClause.scope = { startsWith: "agent." };
        }

        await prisma.permission.deleteMany({ where: whereClause });

        // Add new permissions (only the ones that are checked)
        if (permissions.length > 0) {
          const permissionData = permissions.map((permission) => ({
            scope: permission,
            referenceId: context === "global" ? "global" : referenceId,
            permissionGroupId: groupId,
          }));

          await prisma.permission.createMany({
            data: permissionData,
          });
        }

        return data<ActionData>(
          {
            success: true,
            intent: intent as string,
            message: "Permissions updated successfully",
          },
          { status: 200 },
        );
      } catch (error) {
        console.error(error);
        return data<ActionData>(
          {
            success: false,
            intent: intent as string,
            error: "Failed to update permissions",
          },
          { status: 500 },
        );
      }
    }

    default:
      return data<ActionData>(
        { success: false, intent: intent as string, error: "Invalid action" },
        { status: 400 },
      );
  }
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const groupId = params.groupId as string;
  const user = await hasAccess(request, PERMISSIONS.EDIT_GLOBAL_SETTINGS);

  const permissionGroupPromise = prisma.permissionGroup.findUnique({
    where: { id: groupId },
    include: {
      userPermissionGroups: {
        include: {
          user: true,
        },
      },
      permissions: true,
      _count: {
        select: {
          userPermissionGroups: true,
          permissions: true,
        },
      },
    },
  });

  const spacesPromise = prisma.space.findMany({
    orderBy: { name: "asc" },
    include: {
      agents: {
        orderBy: { name: "asc" },
      },
    },
  });

  const [permissionGroup, spaces] = await Promise.all([
    permissionGroupPromise,
    spacesPromise,
  ]);

  if (!permissionGroup) {
    throw new Response("Permission Group not found", { status: 404 });
  }

  return {
    user,
    permissionGroup,
    spaces,
  };
};

interface PermissionEntry {
  name: string;
  description: string;
}

const HierarchicalPermissionSection = ({
  title,
  permissions,
  availablePermissions,
  context,
  referenceId,
  checker,
  spaceName,
  agentName,
  onPermissionChange,
}: {
  title: string;
  permissions: string[];
  availablePermissions: [string, PermissionEntry][];
  context: string;
  referenceId: string;
  checker: HierarchicalPermissionChecker;
  spaceName?: string;
  agentName?: string;
  onPermissionChange: (
    permission: string,
    checked: boolean,
    referenceId: string,
  ) => void;
}) => {
  const [showInherited, setShowInherited] = useState(false);

  const getPermissionStatus = (permission: string) => {
    const hasDirect = permissions.includes(permission);
    const hasInherited =
      !hasDirect && checker.hasPermission(permission, referenceId);

    return {
      hasDirect,
      hasInherited,
      hasAny: hasDirect || hasInherited,
    };
  };

  // Since all permissions are now objects, the key is the permission scope
  const getPermissionScope = (key: string): string => key;
  const getPermissionName = (permissionEntry: PermissionEntry): string =>
    permissionEntry.name;

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

  const directPermissions = availablePermissions.filter(
    ([key, permissionEntry]) => permissions.includes(getPermissionScope(key)),
  );

  const inheritedPermissions = availablePermissions.filter(
    ([key, permissionEntry]) => {
      const status = getPermissionStatus(getPermissionScope(key));
      return status.hasInherited;
    },
  );

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span>{getContextIcon(context)}</span>
          <h4 className="font-medium text-lg">{title}</h4>
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
      </div>

      <form method="post" className="space-y-4">
        <input type="hidden" name="intent" value="updatePermissions" />
        <input type="hidden" name="context" value={context} />
        <input type="hidden" name="referenceId" value={referenceId} />

        {/* Direct Permissions */}
        <div>
          <h5 className="font-medium text-sm text-muted-foreground mb-3">
            Direct Permissions
          </h5>
          <div className="space-y-3">
            {availablePermissions.map(([key, permissionEntry]) => {
              const permissionScope = getPermissionScope(key);
              const permissionName = getPermissionName(permissionEntry);
              const status = getPermissionStatus(permissionScope);
              return (
                <div
                  key={permissionScope}
                  className="flex items-center space-x-3"
                >
                  <input
                    type="checkbox"
                    id={`${context}-${referenceId}-${permissionScope}`}
                    name="permissions"
                    value={permissionScope}
                    checked={status.hasDirect}
                    onChange={(e) =>
                      onPermissionChange(
                        permissionScope,
                        e.target.checked,
                        referenceId,
                      )
                    }
                    className="rounded border border-gray-300"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`${context}-${referenceId}-${permissionScope}`}
                      className={`text-sm font-medium leading-none ${
                        status.hasDirect
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {permissionName}
                    </Label>
                    <div className="text-xs text-muted-foreground mt-1">
                      {permissionEntry.description}
                    </div>
                    {status.hasInherited && !status.hasDirect && (
                      <div className="flex items-center gap-1 mt-1">
                        <ArrowDown className="h-3 w-3 text-blue-600" />
                        <span className="text-xs text-blue-600">
                          Available via inheritance
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

        {/* Inherited Permissions Display */}
        {inheritedPermissions.length > 0 && (
          <div className="pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowInherited(!showInherited)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-3"
            >
              {showInherited ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Inherited Permissions ({inheritedPermissions.length})
              <Info className="h-3 w-3" />
            </button>

            {showInherited && (
              <div className="space-y-2">
                {inheritedPermissions.map(([key, permissionEntry]) => {
                  const permissionScope = getPermissionScope(key);
                  const permissionName = getPermissionName(permissionEntry);
                  return (
                    <div
                      key={permissionScope}
                      className="flex items-center gap-3 p-2 bg-blue-50 rounded border border-blue-200"
                    >
                      <ArrowDown className="h-4 w-4 text-blue-600" />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-blue-900">
                          {permissionName}
                        </span>
                        <div className="text-xs text-blue-600">
                          Inherited from higher-level permission
                        </div>
                      </div>
                      <Check className="h-4 w-4 text-blue-600" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Permission Flow Visualization for Agents */}
        {context === "agent" &&
          (directPermissions.length > 0 || inheritedPermissions.length > 0) && (
            <div className="pt-4 border-t">
              <h5 className="font-medium text-sm text-muted-foreground mb-2">
                Permission Flow
              </h5>
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

        <Button type="submit" size="sm">
          Update {title} Permissions
        </Button>
      </form>
    </div>
  );
};

const PermissionGroupDetail = () => {
  const { user, permissionGroup, spaces } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [openSpaces, setOpenSpaces] = useState<{ [key: string]: boolean }>({});
  const [openAgents, setOpenAgents] = useState<{ [key: string]: boolean }>({});

  // Local state for live permission updates
  const [livePermissions, setLivePermissions] = useState<PermissionContext[]>(
    permissionGroup.permissions.map((p) => ({
      scope: p.scope,
      referenceId: p.referenceId,
    })),
  );

  useEffect(() => {
    if (actionData && actionData.success) {
      toast.success(actionData.message);
    }
    if (actionData && actionData.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  // Create space-agent mapping
  const spaceAgentMap = new Map<string, string[]>();
  spaces.forEach((space) => {
    spaceAgentMap.set(
      space.id,
      space.agents.map((agent) => agent.id),
    );
  });

  // Create hierarchical permission checker with live permissions
  const checker = new HierarchicalPermissionChecker(
    livePermissions,
    spaceAgentMap,
  );

  // Handle permission toggle for live updates
  const handlePermissionToggle = (
    permission: string,
    checked: boolean,
    referenceId: string,
  ) => {
    setLivePermissions((prev) => {
      if (checked) {
        // Add permission if not already present
        const exists = prev.some(
          (p) => p.scope === permission && p.referenceId === referenceId,
        );
        if (!exists) {
          return [...prev, { scope: permission, referenceId }];
        }
        return prev;
      } else {
        // Remove permission when unchecked
        return prev.filter(
          (p) => !(p.scope === permission && p.referenceId === referenceId),
        );
      }
    });
  };

  const getPermissionsForContext = (context: string, referenceId: string) => {
    let contextPermissions = livePermissions.filter((p) => {
      if (context === "global") {
        return p.scope.startsWith("global.") && p.referenceId === "global";
      } else if (context === "space") {
        return p.scope.startsWith("space.") && p.referenceId === referenceId;
      } else if (context === "agent") {
        return p.scope.startsWith("agent.") && p.referenceId === referenceId;
      }
      return false;
    });
    return contextPermissions.map((p) => p.scope);
  };

  const toggleSpace = (spaceId: string) => {
    setOpenSpaces((prev) => ({ ...prev, [spaceId]: !prev[spaceId] }));
  };

  const toggleAgent = (agentId: string) => {
    setOpenAgents((prev) => ({ ...prev, [agentId]: !prev[agentId] }));
  };

  return (
    <Layout navComponent={<OverviewNav user={user} />} user={user}>
      <div className="py-8 px-4 md:p-8 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/permission">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Permissions
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-medium">{permissionGroup.name}</h1>
            <p className="text-muted-foreground">
              {permissionGroup.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Group Overview Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Group Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </div>
                  <div className="text-2xl font-bold">
                    {permissionGroup._count.userPermissionGroups}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Permissions
                  </div>
                  <div className="text-2xl font-bold">
                    {permissionGroup._count.permissions}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Created
                  </div>
                  <div className="text-sm">
                    {new Date(permissionGroup.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users in Group */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users ({permissionGroup._count.userPermissionGroups})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {permissionGroup.userPermissionGroups.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No users assigned to this group.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {permissionGroup.userPermissionGroups.map((upg) => (
                      <div
                        key={upg.id}
                        className="flex items-center justify-between p-2 rounded border"
                      >
                        <div>
                          <div className="font-medium">{upg.user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {upg.user.email}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Permission Management */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* Global Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Global Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                  <HierarchicalPermissionSection
                    title="Global System Permissions"
                    permissions={getPermissionsForContext("global", "global")}
                    availablePermissions={Object.entries(
                      AVAILABLE_PERMISSIONS.global,
                    )}
                    context="global"
                    referenceId="global"
                    checker={checker}
                    onPermissionChange={handlePermissionToggle}
                  />
                </CardContent>
              </Card>

              {/* Space Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Space & Agent Permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {spaces.map((space) => (
                    <div key={space.id}>
                      <button
                        onClick={() => toggleSpace(space.id)}
                        className="flex items-center justify-between w-full p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          {openSpaces[space.id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{space.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({space.agents.length} agents)
                          </span>
                        </div>
                      </button>
                      {openSpaces[space.id] && (
                        <div className="pt-4">
                          <div className="space-y-4">
                            {/* Space Permissions */}
                            <HierarchicalPermissionSection
                              title={`${space.name} Space Permissions`}
                              permissions={getPermissionsForContext(
                                "space",
                                space.id,
                              )}
                              availablePermissions={Object.entries(
                                AVAILABLE_PERMISSIONS.space,
                              )}
                              context="space"
                              referenceId={space.id}
                              checker={checker}
                              spaceName={space.name}
                              onPermissionChange={handlePermissionToggle}
                            />

                            {/* Agent Permissions */}
                            {space.agents.length > 0 && (
                              <div className="ml-4 space-y-3">
                                <h5 className="font-medium text-muted-foreground">
                                  Agents in {space.name}
                                </h5>
                                {space.agents.map((agent) => (
                                  <div key={agent.id}>
                                    <button
                                      onClick={() => toggleAgent(agent.id)}
                                      className="flex items-center justify-between w-full p-2 text-left bg-blue-50 rounded hover:bg-blue-100"
                                    >
                                      <div className="flex items-center gap-2">
                                        {openAgents[agent.id] ? (
                                          <ChevronDown className="h-3 w-3" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3" />
                                        )}
                                        <span className="text-sm font-medium">
                                          {agent.name}
                                        </span>
                                      </div>
                                    </button>
                                    {openAgents[agent.id] && (
                                      <div className="pt-3">
                                        <HierarchicalPermissionSection
                                          title={`${agent.name} Agent Permissions`}
                                          permissions={getPermissionsForContext(
                                            "agent",
                                            agent.id,
                                          )}
                                          availablePermissions={Object.entries(
                                            AVAILABLE_PERMISSIONS.agent,
                                          )}
                                          context="agent"
                                          referenceId={agent.id}
                                          checker={checker}
                                          spaceName={space.name}
                                          agentName={agent.name}
                                          onPermissionChange={
                                            handlePermissionToggle
                                          }
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </Layout>
  );
};

export default PermissionGroupDetail;
