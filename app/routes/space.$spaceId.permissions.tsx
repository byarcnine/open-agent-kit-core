import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useActionData,
  data,
  Form,
  Link,
} from "react-router";
import { prisma } from "@db/db.server";
import { Users, Settings, Plus } from "react-feather";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { z } from "zod";
import Layout from "~/components/layout/layout";
import NoDataCard from "~/components/ui/no-data-card";
import { useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  getUserScopes,
  getUserWithAccessToSpace,
  hasAccessHierarchical,
  setUserPermissionGroups,
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
import { Badge } from "~/components/ui/badge";
import { toast, Toaster } from "sonner";
import { createInvitation } from "~/lib/auth/handleInvite.server";
import { InviteUserModal } from "~/components/inviteUserModal/inviteUserModal";
import { ManageUserPermissionGroupsDialog } from "~/components/manageUserPermissionGroupsDialog/manageUserPermissionGroupsDialog";
import { CreatePermissionGroupDialog } from "~/components/createPermissionGroupDialog/createPermissionGroupDialog";

const createPermissionGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const manageUserPermissionGroupsSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  permissionGroups: z.string().transform((val) => {
    try {
      return JSON.parse(val) as string[];
    } catch {
      throw new Error("Invalid permission groups data");
    }
  }),
});

const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  permissionGroupIds: z
    .array(z.string())
    .min(1, "At least one permission group is required"),
});

type ActionData = {
  success: boolean;
  error?: string;
  message?: string;
  intent: string;
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { spaceId } = params;

  if (!spaceId) {
    return { errors: { general: ["Space ID is required"] } };
  }

  const user = await hasAccessHierarchical(
    request,
    PERMISSION["space.edit_users"],
    spaceId,
  );

  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "createPermissionGroup": {
      const result = createPermissionGroupSchema.safeParse({
        name: formData.get("name"),
        description: formData.get("description"),
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

      const { name, description } = result.data;

      try {
        // Create space-scoped permission group
        await prisma.permissionGroup.create({
          data: {
            name,
            description,
            level: "SPACE",
            spaceId,
          },
        });

        return data<ActionData>(
          {
            success: true,
            intent: intent as string,
            message: "Permission group created successfully",
          },
          { status: 200 },
        );
      } catch (error) {
        console.error(error);
        return data<ActionData>(
          {
            success: false,
            intent: intent as string,
            error: "Failed to create permission group",
          },
          { status: 500 },
        );
      }
    }

    case "manageUserPermissionGroups": {
      const result = manageUserPermissionGroupsSchema.safeParse({
        userId: formData.get("userId"),
        permissionGroups: formData.get("permissionGroups"),
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

      const { userId, permissionGroups } = result.data;

      try {
        await setUserPermissionGroups(
          user,
          userId,
          permissionGroups,
          "SPACE",
          spaceId,
        );

        return data<ActionData>(
          {
            success: true,
            intent: intent as string,
            message: "User permission groups updated successfully",
          },
          { status: 200 },
        );
      } catch (error) {
        console.error(error);
        return data<ActionData>(
          {
            success: false,
            intent: intent as string,
            error: "Failed to update user permission groups",
          },
          { status: 500 },
        );
      }
    }

    case "invite": {
      const result = inviteUserSchema.safeParse({
        email: formData.get("email"),
        permissionGroupIds: formData.getAll("permissionGroupIds"),
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

      const { email, permissionGroupIds } = result.data;

      try {
        await createInvitation(email, permissionGroupIds);
        return data<ActionData>(
          {
            success: true,
            intent: intent as string,
            message: "User invited successfully",
          },
          { status: 200 },
        );
      } catch (error) {
        console.error(error);
        return data<ActionData>(
          {
            success: false,
            intent: intent as string,
            error: "Failed to invite user",
          },
          { status: 500 },
        );
      }
    }

    default:
      return data<ActionData>(
        {
          success: false,
          intent: intent as string,
          error: "Invalid intent",
        },
        { status: 400 },
      );
  }
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { spaceId } = params;

  if (!spaceId) {
    throw data({ error: "Space ID is required" }, { status: 400 });
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

  // Get all users and their space-scoped permission groups
  const usersPromise = getUserWithAccessToSpace(spaceId);

  // Get all space-scoped permission groups
  const permissionGroupsPromise = prisma.permissionGroup.findMany({
    where: {
      level: "SPACE",
      spaceId,
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
    orderBy: {
      name: "asc",
    },
  });

  const [users, permissionGroups] = await Promise.all([
    usersPromise,
    permissionGroupsPromise,
  ]);

  const userScopes = await getUserScopes(user);

  // Get available space permissions
  const spacePermissions = Object.entries(AVAILABLE_PERMISSIONS)
    .filter(([key]) => key.startsWith("space."))
    .map(([key, value]) => ({
      key,
      ...value,
    }));

  return {
    user: user as SessionUser,
    space,
    users,
    permissionGroups,
    userScopes,
    spacePermissions,
  };
};

const SpacePermissionManagement = () => {
  const { space, users, permissionGroups } = useLoaderData<typeof loader>();
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
    <>
      <Toaster />
      <div className="py-8 px-4 md:p-8 w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-medium">
              {space.name} - Permission Management
            </h1>
            <p className="text-muted-foreground">
              Manage users and permission groups for this space
            </p>
          </div>
          <div className="flex gap-2">
            <InviteUserModal
              permissionGroups={permissionGroups}
              error={
                actionData && "error" in actionData
                  ? actionData.error
                  : undefined
              }
            />
            <CreatePermissionGroupDialog />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Users Table */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Users ({users.length})
                </CardTitle>
                <CardDescription>
                  Users with access to this space
                </CardDescription>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <NoDataCard
                    headline="No users"
                    description="No users have been assigned to this space yet."
                  >
                    <InviteUserModal
                      permissionGroups={permissionGroups}
                      error={
                        actionData && "error" in actionData
                          ? actionData.error
                          : undefined
                      }
                    />
                  </NoDataCard>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Groups</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {user.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.userPermissionGroups.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {user.userPermissionGroups.map((upg) => (
                                    <Badge
                                      key={upg.id}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {upg.permissionGroup.name}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  None
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <ManageUserPermissionGroupsDialog
                                user={user}
                                permissionGroups={permissionGroups}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Permission Groups Table */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Permission Groups ({permissionGroups.length})
                </CardTitle>
                <CardDescription>
                  Permission groups for this space
                </CardDescription>
              </CardHeader>
              <CardContent>
                {permissionGroups.length === 0 ? (
                  <NoDataCard
                    headline="No permission groups"
                    description="Create your first permission group to start managing permissions."
                  >
                    <CreatePermissionGroupDialog />
                  </NoDataCard>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Group</TableHead>
                          <TableHead>Users</TableHead>
                          <TableHead>Permissions</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {permissionGroups.map((group) => (
                          <TableRow key={group.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {group.name.replace(/^[^:]+:/, "")}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {group.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {group._count.userPermissionGroups}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {group._count.permissions}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link
                                to={`/space/${space.id}/permissions/group/${group.id}`}
                              >
                                <Button variant="outline" size="sm">
                                  <Settings className="h-4 w-4 mr-1" />
                                  Configure
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default SpacePermissionManagement;

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `${data?.space?.name} - Permission Management | OAK Dashboard` },
    {
      name: "description",
      content: "Manage users and permissions for this space",
    },
  ];
};
