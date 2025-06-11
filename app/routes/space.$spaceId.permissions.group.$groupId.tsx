import {
  useLoaderData,
  useActionData,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  Link,
  type MetaFunction,
  Form,
} from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { prisma } from "@db/db.server";
import Layout from "~/components/layout/layout";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Label } from "~/components/ui/label";
import { z } from "zod";
import { useEffect } from "react";
import { toast, Toaster } from "sonner";
import {
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import {
  PERMISSION,
  AVAILABLE_PERMISSIONS,
} from "~/lib/permissions/permissions";
import type { SessionUser } from "~/types/auth";
import { SpaceDetailNav } from "~/components/spaceDetailNav/spaceDetailNav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ArrowLeft, Settings, Users } from "react-feather";

const updatePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

type ActionData = {
  success: boolean;
  error?: string;
  message?: string;
  intent: string;
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { spaceId, groupId } = params;

  if (!spaceId || !groupId) {
    return { errors: { general: ["Space ID and Group ID are required"] } };
  }

  await hasAccessHierarchical(request, PERMISSION["space.edit_users"], spaceId);

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "updatePermissions") {
    const result = updatePermissionsSchema.safeParse({
      permissions: formData.getAll("permissions"),
    });

    if (!result.success) {
      return data<ActionData>(
        {
          success: false,
          intent: intent as string,
          error: result.error.issues[0].message,
        },
        { status: 400 },
      );
    }

    const { permissions } = result.data;

    try {
      // Remove existing space permissions for this group
      await prisma.permission.deleteMany({
        where: {
          permissionGroupId: groupId,
          referenceId: spaceId,
          scope: { startsWith: "space." },
        },
      });

      // Add new permissions
      if (permissions.length > 0) {
        const permissionData = permissions.map((permission) => ({
          scope: permission,
          referenceId: spaceId,
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

  return data<ActionData>(
    {
      success: false,
      intent: intent as string,
      error: "Invalid intent",
    },
    { status: 400 },
  );
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { spaceId, groupId } = params;

  if (!spaceId || !groupId) {
    throw data(
      { error: "Space ID and Group ID are required" },
      { status: 400 },
    );
  }

  const user = await hasAccessHierarchical(
    request,
    PERMISSION["space.view_space_settings"],
    spaceId,
  );

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
  });

  if (!space) {
    throw data({ error: "Space not found" }, { status: 404 });
  }

  const permissionGroup = await prisma.permissionGroup.findUnique({
    where: {
      id: groupId,
    },
    include: {
      userPermissionGroups: {
        include: {
          user: true,
        },
      },
      permissions: {
        where: {
          referenceId: spaceId,
          scope: { startsWith: "space." },
        },
      },
      _count: {
        select: {
          userPermissionGroups: true,
          permissions: true,
        },
      },
    },
  });

  if (!permissionGroup) {
    throw data({ error: "Permission group not found" }, { status: 404 });
  }

  // Verify this group belongs to this space
  if (
    permissionGroup.level !== "SPACE" ||
    permissionGroup.spaceId !== spaceId
  ) {
    throw data(
      { error: "Permission group does not belong to this space" },
      { status: 403 },
    );
  }

  const userScopes = await getUserScopes(user);

  // Get available space permissions
  const spacePermissions = Object.entries(AVAILABLE_PERMISSIONS)
    .filter(([key]) => key.startsWith("space."))
    .map(([key, value]) => ({
      key,
      ...value,
    }));

  // Get current permissions for this group
  const currentPermissions = permissionGroup.permissions.map((p) => p.scope);

  return {
    user: user as SessionUser,
    space,
    permissionGroup,
    userScopes,
    spacePermissions,
    currentPermissions,
  };
};

const PermissionSection = ({
  title,
  permissions,
  availablePermissions,
  currentPermissions,
}: {
  title: string;
  permissions: string[];
  availablePermissions: Array<{
    key: string;
    name: string;
    description: string;
  }>;
  currentPermissions: string[];
}) => {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-lg">{title}</h4>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{permissions.length} direct</Badge>
        </div>
      </div>

      <Form method="post" className="space-y-4">
        <input type="hidden" name="intent" value="updatePermissions" />

        <div className="space-y-3">
          {availablePermissions.map((permission) => {
            const isChecked = currentPermissions.includes(permission.key);
            return (
              <div key={permission.key} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id={permission.key}
                  name="permissions"
                  value={permission.key}
                  defaultChecked={isChecked}
                  className="mt-1 rounded"
                />
                <div className="flex-1">
                  <Label htmlFor={permission.key} className="cursor-pointer">
                    <div className="font-medium">{permission.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {permission.description}
                    </div>
                  </Label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t">
          <Button type="submit">Update Permissions</Button>
        </div>
      </Form>
    </div>
  );
};

const SpacePermissionGroupDetail = () => {
  const {
    user,
    space,
    permissionGroup,
    userScopes,
    spacePermissions,
    currentPermissions,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      toast.success(actionData.message);
    }
    if (actionData && "error" in actionData && actionData.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  return (
    <Layout
      navComponent={<SpaceDetailNav space={space} userScopes={userScopes} />}
      user={user}
    >
      <Toaster />
      <div className="py-8 px-4 md:p-8 w-full mx-auto">
        <div className="mb-8">
          <Link className="mb-4 block" to={`/space/${space.id}/permissions`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Space Permissions
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-medium">{permissionGroup.name}</h1>
            <p className="text-muted-foreground">
              {permissionGroup.description}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline">Space Level</Badge>
              <Badge variant="secondary">{space.name}</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Group Info */}
          <div>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Group Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Name
                    </Label>
                    <div className="font-medium">{permissionGroup.name}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Description
                    </Label>
                    <div className="text-sm">{permissionGroup.description}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Level
                    </Label>
                    <div className="text-sm">{permissionGroup.level}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Space
                    </Label>
                    <div className="text-sm">{space.name}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Users in Group */}
            <Card>
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
              <Card>
                <CardHeader>
                  <CardTitle>Space Permissions</CardTitle>
                  <CardDescription>
                    Manage what this group can do within the "{space.name}"
                    space
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PermissionSection
                    title={`${space.name} Space Permissions`}
                    permissions={currentPermissions}
                    availablePermissions={spacePermissions}
                    currentPermissions={currentPermissions}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SpacePermissionGroupDetail;

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    {
      title: `${data?.permissionGroup?.name} - ${data?.space?.name} | OAK Dashboard`,
    },
    { name: "description", content: "Manage permission group settings" },
  ];
};
