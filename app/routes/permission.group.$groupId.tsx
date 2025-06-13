import {
  useLoaderData,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  Link,
  type MetaFunction,
  useFetcher,
} from "react-router";
import { prisma, type Permission } from "@db/db.server";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, Shield, ChevronDown, ChevronRight } from "react-feather";
import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { Label } from "~/components/ui/label";

import { Badge } from "~/components/ui/badge";
import { Check, ArrowDown } from "react-feather";
import {
  AVAILABLE_PERMISSIONS,
  PERMISSION,
} from "~/lib/permissions/permissions";
import {
  getGroupGrantedPermissions,
  getUserScopes,
  hasAccessHierarchical,
  resolvePermissionReferences,
  type UserGrantedPermissions,
} from "~/lib/permissions/enhancedHasAccess.server";

type ActionData = {
  success: boolean;
  error?: string;
  message?: string;
  intent: string;
  updatedPermissions?: Partial<Permission>[];
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const groupId = params.groupId as string;
  const formData = await request.formData();
  await hasAccessHierarchical(request, PERMISSION["global.edit_global_users"]);

  const intent = formData.get("intent");

  switch (intent) {
    case "recalculatePermissions": {
      const permissions = JSON.parse(
        formData.get("permissions") as string,
      ) as UserGrantedPermissions;
      const updatedPermissions = await resolvePermissionReferences(
        permissions.filter((p) => p.direct),
      );
      return data<ActionData>(
        {
          success: true,
          intent: intent as string,
          updatedPermissions,
        },
        { status: 200 },
      );
    }
    case "updatePermissions": {
      const permissions = JSON.parse(
        formData.get("permissions") as string,
      ) as UserGrantedPermissions;
      await prisma.$transaction(async (tx) => {
        await tx.permission.deleteMany({
          where: {
            permissionGroupId: groupId,
          },
        });
        await tx.permission.createMany({
          data: permissions.map((p) => ({
            scope: p.scope,
            referenceId: p.referenceId,
            permissionGroupId: groupId,
          })),
        });
      });
      try {
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
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.edit_global_users"],
  );

  const [allGroupPermissions, spaces, permissionGroup] = await Promise.all([
    getGroupGrantedPermissions(groupId),
    prisma.space.findMany({
      include: {
        agents: true,
      },
    }),
    prisma.permissionGroup.findUnique({
      where: {
        id: groupId,
      },
      include: {
        _count: {
          select: {
            userPermissionGroups: true,
          },
        },
      },
    }),
  ]);

  if (!permissionGroup) {
    throw new Response("Permission group not found", { status: 404 });
  }
  const userScopes = await getUserScopes(user);

  return {
    user,
    allGroupPermissions,
    spaces,
    permissionGroup,
    userScopes,
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
  spaceName,
  agentName,
  toggleScope,
}: {
  title: string;
  permissions: {
    scope: string;
    direct: boolean;
  }[];
  availablePermissions: [string, PermissionEntry][];
  context: string;
  referenceId: string;
  spaceName?: string;
  agentName?: string;
  toggleScope: (scope: string) => void;
}) => {
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

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span>{getContextIcon(context)}</span>
          <h4 className="font-medium text-lg">{title}</h4>
          {spaceName && <Badge variant="outline">{spaceName}</Badge>}
          {agentName && <Badge variant="outline">{agentName}</Badge>}
        </div>
        {/* <div className="flex items-center gap-2">
          <Badge variant="secondary">{directPermissions.length} direct</Badge>
          {inheritedPermissions.length > 0 && (
            <Badge variant="outline">
              {inheritedPermissions.length} inherited
            </Badge>
          )}
        </div> */}
      </div>
      <div className="space-y-4">
        {/* Direct Permissions */}
        <div>
          <h5 className="font-medium text-sm text-muted-foreground mb-3">
            Direct Permissions
          </h5>
          <div className="space-y-3">
            {availablePermissions.map(([key, permissionEntry]) => {
              const permissionScope = getPermissionScope(key);
              const permissionName = getPermissionName(permissionEntry);
              const status = permissions.find(
                (p) => p.scope === permissionScope,
              );
              const hasInherited = status && !status.direct;
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
                    checked={status?.direct}
                    disabled={hasInherited}
                    onChange={(e) => toggleScope(permissionScope)}
                    className={`rounded border ${
                      hasInherited
                        ? "border-gray-300"
                        : "border-blue-300 bg-blue-50 text-blue-600"
                    }`}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`${context}-${referenceId}-${permissionScope}`}
                      className={`text-sm font-medium leading-none ${
                        hasInherited
                          ? "text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {permissionName}
                    </Label>
                    <div className="text-xs text-muted-foreground mt-1">
                      {permissionEntry.description}
                    </div>
                    {/* {!status?.direct && (
                      <div className="flex items-center gap-1 mt-1">
                        <ArrowDown className="h-3 w-3 text-blue-600" />
                        <span className="text-xs text-blue-600">
                          Available via inheritance from{" "}
                          {status.inheritedFrom.join(", ")}.
                        </span>
                      </div>
                    )} */}
                  </div>
                  {status && (
                    <Check
                      className={`h-4 w-4 ${
                        status.direct ? "text-green-600" : "text-blue-600"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const PermissionGroupDetail = () => {
  const { user, allGroupPermissions, spaces, permissionGroup, userScopes } =
    useLoaderData<typeof loader>();
  const [openSpaces, setOpenSpaces] = useState<{ [key: string]: boolean }>({});
  const [openAgents, setOpenAgents] = useState<{ [key: string]: boolean }>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const updateFetcher = useFetcher();
  const [currentPermissions, setCurrentPermissions] =
    useState(allGroupPermissions);

  const toggleScope = (
    scope: keyof typeof AVAILABLE_PERMISSIONS,
    referenceId: string,
  ) => {
    setHasUnsavedChanges(true);
    let permissionCopy = structuredClone(currentPermissions);
    const hasPermissionIndex = permissionCopy.findIndex(
      (p) => p.scope === scope && p.referenceId === referenceId,
    );
    if (hasPermissionIndex !== -1) {
      // delete that index from the array
      permissionCopy.splice(hasPermissionIndex, 1);
      setCurrentPermissions([...permissionCopy]);
    } else {
      permissionCopy.push({
        scope,
        direct: true,
        referenceId: referenceId,
      });
      setCurrentPermissions([...permissionCopy]);
    }
    const formData = new FormData();
    formData.append("intent", "recalculatePermissions");
    formData.append("permissions", JSON.stringify(permissionCopy));
    updateFetcher.submit(formData, { method: "post" });
  };
  // Helper function to get available permissions by scope
  const getAvailablePermissionsByScope = (
    scope: string,
  ): [string, PermissionEntry][] => {
    return Object.entries(AVAILABLE_PERMISSIONS)
      .filter(([key]) => key.startsWith(`${scope}.`))
      .map(([key, value]) => [key, value as PermissionEntry]);
  };

  const submitScopes = () => {
    const formData = new FormData();
    const directPermissions = currentPermissions.filter((p) => p.direct);
    formData.append("intent", "updatePermissions");
    formData.append("permissions", JSON.stringify(directPermissions));
    updateFetcher.submit(formData, { method: "post" });
  };

  useEffect(() => {
    if (
      updateFetcher.state === "idle" &&
      updateFetcher.data?.success &&
      updateFetcher.data.intent === "updatePermissions"
    ) {
      setCurrentPermissions(allGroupPermissions);
      setHasUnsavedChanges(false);
    }
    if (
      updateFetcher.state === "idle" &&
      updateFetcher.data?.success &&
      updateFetcher.data.intent === "recalculatePermissions"
    ) {
      setCurrentPermissions(updateFetcher.data.updatedPermissions);
    }
  }, [updateFetcher.state, updateFetcher.data]);

  return (
    <Layout navComponent={<OverviewNav userScopes={userScopes} />} user={user}>
      <div className="py-8 px-4 md:p-8 w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Link to="/permissions">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Permissions
              </Button>
            </Link>
          </div>

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
                    {currentPermissions.length}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {currentPermissions.filter((p) => p.direct).length} direct
                    </Badge>
                    {currentPermissions.filter((p) => !p.direct).length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {currentPermissions.filter((p) => !p.direct).length}{" "}
                        inherited
                      </Badge>
                    )}
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
            {/* <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users ({permissionGroup._count.userPermissionGroups})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {permissionGroup._count.userPermissionGroups === 0 ? (
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
            </Card> */}
          </div>

          {/* Permission Management */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* Global Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Global Permissions</CardTitle>
                  <div className="pt-2 pb-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-1 bg-purple-100 rounded">
                        Global
                      </span>
                      <ArrowDown className="h-3 w-3" />
                      <span className="px-2 py-1 bg-blue-100 rounded">
                        Space
                      </span>
                      <ArrowDown className="h-3 w-3" />
                      <span className="px-2 py-1 bg-green-100 rounded font-medium">
                        Agent
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <HierarchicalPermissionSection
                    title="Global System Permissions"
                    permissions={currentPermissions.filter((p) =>
                      p.scope.startsWith("global."),
                    )}
                    availablePermissions={getAvailablePermissionsByScope(
                      "global",
                    )}
                    context="global"
                    referenceId="global"
                    toggleScope={(scope) => toggleScope(scope as any, "global")}
                  />
                </CardContent>
              </Card>

              {/* Space Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle>Space & Agent Permissions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {spaces.map((space) => {
                    // const spaceCounts = spaces.length;
                    // const agentCounts = space.agents.length;
                    const directInAgents = space.agents.reduce((acc, agent) => {
                      return (
                        acc +
                        currentPermissions.filter(
                          (p) =>
                            p.scope.startsWith("agent.") &&
                            p.referenceId === agent.id &&
                            p.direct,
                        ).length
                      );
                    }, 0);
                    const indirectInAgents = space.agents.reduce(
                      (acc, agent) => {
                        return (
                          acc +
                          currentPermissions.filter(
                            (p) =>
                              p.scope.startsWith("agent.") &&
                              p.referenceId === agent.id &&
                              !p.direct,
                          ).length
                        );
                      },
                      0,
                    );
                    const totalDirect =
                      currentPermissions.filter(
                        (p) =>
                          p.scope.startsWith("space.") &&
                          p.referenceId === space.id &&
                          p.direct,
                      ).length + directInAgents;
                    const totalInherited =
                      currentPermissions.filter(
                        (p) =>
                          p.scope.startsWith("space.") &&
                          p.referenceId === space.id &&
                          !p.direct,
                      ).length + indirectInAgents;

                    return (
                      <div key={space.id}>
                        <button
                          onClick={() =>
                            setOpenSpaces((prev) => ({
                              ...prev,
                              [space.id]: !prev[space.id],
                            }))
                          }
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
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {totalDirect} direct
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {totalInherited} inherited
                            </Badge>
                          </div>
                        </button>
                        {openSpaces[space.id] && (
                          <div className="pt-4">
                            <div className="space-y-4">
                              {/* Space Permissions */}
                              <HierarchicalPermissionSection
                                title={`${space.name} Space Permissions`}
                                permissions={currentPermissions.filter(
                                  (p) =>
                                    p.scope.startsWith("space.") &&
                                    p.referenceId === space.id,
                                )}
                                availablePermissions={getAvailablePermissionsByScope(
                                  "space",
                                )}
                                context="space"
                                referenceId={space.id}
                                spaceName={space.name}
                                toggleScope={(scope) =>
                                  toggleScope(scope as any, space.id)
                                }
                              />

                              {/* Agent Permissions */}
                              {space.agents.length > 0 && (
                                <div className="ml-4 space-y-3">
                                  <h5 className="font-medium text-muted-foreground">
                                    Agents in {space.name}
                                  </h5>
                                  {space.agents.map((agent) => {
                                    const totalDirect =
                                      currentPermissions.filter(
                                        (p) =>
                                          p.scope.startsWith("agent.") &&
                                          p.referenceId === agent.id &&
                                          p.direct,
                                      ).length;
                                    const totalInherited =
                                      currentPermissions.filter(
                                        (p) =>
                                          p.scope.startsWith("agent.") &&
                                          p.referenceId === agent.id &&
                                          !p.direct,
                                      ).length;

                                    return (
                                      <div key={agent.id}>
                                        <button
                                          onClick={() =>
                                            setOpenAgents((prev) => ({
                                              ...prev,
                                              [agent.id]: !prev[agent.id],
                                            }))
                                          }
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
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              variant="secondary"
                                              className="text-xs"
                                            >
                                              {totalDirect} direct
                                            </Badge>
                                            <Badge
                                              variant="outline"
                                              className="text-xs"
                                            >
                                              {totalInherited} inherited
                                            </Badge>
                                          </div>
                                        </button>
                                        {openAgents[agent.id] && (
                                          <div className="pt-3">
                                            <HierarchicalPermissionSection
                                              title={`${agent.name} Agent Permissions`}
                                              permissions={currentPermissions.filter(
                                                (p) =>
                                                  p.scope.startsWith(
                                                    "agent.",
                                                  ) &&
                                                  p.referenceId === agent.id,
                                              )}
                                              availablePermissions={getAvailablePermissionsByScope(
                                                "agent",
                                              )}
                                              context="agent"
                                              referenceId={agent.id}
                                              spaceName={space.name}
                                              agentName={agent.name}
                                              toggleScope={(scope) =>
                                                toggleScope(
                                                  scope as any,
                                                  agent.id,
                                                )
                                              }
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Button */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-300 bg-white shadow-lg"
            >
              Unsaved changes
            </Badge>
            <Button
              onClick={() => submitScopes()}
              disabled={updateFetcher.state === "submitting"}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
              size="lg"
            >
              {updateFetcher.state === "submitting" ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                "Save All Changes"
              )}
            </Button>
          </div>
        </div>
      )}

      <Toaster />
    </Layout>
  );
};

export default PermissionGroupDetail;

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [
      { title: "Permission Management" },
      {
        name: "description",
        content: "Manage permissions for users and groups",
      },
    ];
  }
  const { permissionGroup } = data;
  return [
    { title: `${permissionGroup.name} - Permission Group` },
    {
      name: "description",
      content: `Manage permissions for ${permissionGroup.name} group`,
    },
  ];
};
