import {
  useLoaderData,
  useActionData,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  Link,
} from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import { PERMISSIONS, type SessionUser } from "~/types/auth";
import { prisma } from "@db/db.server";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import NoDataCard from "~/components/ui/no-data-card";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { InviteUserModal } from "~/components/inviteUserModal/inviteUserModal";
import { CreatePermissionGroupDialog } from "~/components/createPermissionGroupDialog/createPermissionGroupDialog";
import { ManageUserPermissionGroupsDialog } from "~/components/manageUserPermissionGroupsDialog/manageUserPermissionGroupsDialog";
import { GLOBAL_ROLES } from "~/lib/auth/roles";
import { z } from "zod";
import { useEffect } from "react";
import { toast, Toaster } from "sonner";
import { sendInvitationEmail } from "~/lib/email/sendInvitationEmail.server";
import { InvitationType } from "@prisma/client";
import { APP_URL } from "~/lib/config/config";

dayjs.extend(relativeTime);

const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["SUPER_ADMIN", "EDIT_ALL_AGENTS", "VIEW_ALL_AGENTS"]),
});

const createPermissionGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
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

type ActionData = {
  success: boolean;
  error?: string;
  message?: string;
  intent: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  await hasAccess(request, PERMISSIONS.EDIT_GLOBAL_SETTINGS);
  const intent = formData.get("intent");

  switch (intent) {
    case "invite": {
      const result = inviteUserSchema.safeParse({
        email: formData.get("email"),
        role: formData.get("role"),
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

      const { email, role } = result.data;

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return data<ActionData>(
          {
            success: false,
            intent: intent as string,
            error: "User already exists",
          },
          { status: 400 },
        );
      }

      const invitation = await prisma.invitation.create({
        data: {
          email,
          globalRole: role,
          type: InvitationType.GLOBAL,
        },
      });
      const inviteLink = `${APP_URL()}/invite/${invitation.id}`;
      await sendInvitationEmail(email, inviteLink);
      return data<ActionData>(
        {
          success: true,
          intent: intent as string,
          message: "Invitation sent successfully",
        },
        { status: 200 },
      );
    }

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
        await prisma.permissionGroup.create({
          data: {
            name,
            description,
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
        // Remove all existing user permission groups for this user
        await prisma.userPermissionGroup.deleteMany({
          where: {
            userId,
          },
        });

        // Add new user permission groups
        if (permissionGroups.length > 0) {
          await prisma.userPermissionGroup.createMany({
            data: permissionGroups.map((groupId) => ({
              userId,
              permissionGroupId: groupId,
            })),
          });
        }

        return data<ActionData>(
          {
            success: true,
            intent: intent as string,
            message: "User permission groups updated successfully",
          },
          { status: 200 },
        );
      } catch (error) {
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

    default:
      return data<ActionData>(
        { success: false, intent: intent as string, error: "Invalid action" },
        { status: 400 },
      );
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccess(request, PERMISSIONS.EDIT_GLOBAL_SETTINGS);

  const usersPromise = prisma.user.findMany({
    include: {
      userPermissionGroups: {
        include: {
          permissionGroup: true,
        },
      },
    },
    orderBy: {
      email: "asc",
    },
  });

  const permissionGroupsPromise = prisma.permissionGroup.findMany({
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
    orderBy: {
      name: "asc",
    },
  });

  const [users, permissionGroups] = await Promise.all([
    usersPromise,
    permissionGroupsPromise,
  ]);

  return {
    user,
    users,
    permissionGroups,
  };
};

const PermissionManagement = () => {
  const { user, users, permissionGroups } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  useEffect(() => {
    if (actionData && actionData.intent === "invite") {
      toast.success(actionData.message);
    }
    if (actionData && actionData.intent === "createPermissionGroup") {
      toast.success(actionData.message);
    }
    if (actionData && actionData.intent === "manageUserPermissionGroups") {
      toast.success(actionData.message);
    }
    if (actionData && actionData.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  return (
    <Layout navComponent={<OverviewNav user={user} />} user={user}>
      <div className="py-8 px-4 md:p-8 w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-medium">Permission Management</h1>
        </div>

        {/* Users Table */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-medium">Users</h2>
            <InviteUserModal roles={GLOBAL_ROLES} error={actionData?.error} />
          </div>
          {!users || users.length === 0 ? (
            <NoDataCard
              headline="No Users Found"
              description="There are no users in the system at the moment."
            >
              <InviteUserModal roles={GLOBAL_ROLES} error={actionData?.error} />
            </NoDataCard>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    {/* <TableHead>Role</TableHead> */}
                    <TableHead>Permission Groups</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      {/* <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.role.replace(/_/g, " ")}
                        </span>
                      </TableCell> */}
                      <TableCell>
                        {user.userPermissionGroups.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.userPermissionGroups.map((upg) => (
                              <span
                                key={upg.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                              >
                                {upg.permissionGroup.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            None
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dayjs(user.createdAt).fromNow()}
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
        </div>

        {/* Permission Groups Table */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-medium">Permission Groups</h2>
            <CreatePermissionGroupDialog error={actionData?.error} />
          </div>
          <p className="text-muted-foreground text-sm mb-6 max-w-lg">
            Manage permission groups and view which users are assigned to each
            group.
          </p>

          {!permissionGroups || permissionGroups.length === 0 ? (
            <NoDataCard
              headline="No Permission Groups Found"
              description="There are no permission groups configured at the moment."
            >
              <CreatePermissionGroupDialog error={actionData?.error} />
            </NoDataCard>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/permissions/group/${group.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {group.name}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={group.description}>
                          {group.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {group._count.userPermissionGroups > 0 ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">
                              {group._count.userPermissionGroups} user
                              {group._count.userPermissionGroups !== 1
                                ? "s"
                                : ""}
                            </span>
                            {group.userPermissionGroups
                              .slice(0, 3)
                              .map((upg) => (
                                <span
                                  key={upg.id}
                                  className="text-xs text-muted-foreground"
                                >
                                  {upg.user.name}
                                </span>
                              ))}
                            {group.userPermissionGroups.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{group.userPermissionGroups.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No users
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {group._count.permissions} permission
                          {group._count.permissions !== 1 ? "s" : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dayjs(group.createdAt).fromNow()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </Layout>
  );
};

export default PermissionManagement;
