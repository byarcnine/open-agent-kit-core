import {
  useLoaderData,
  useActionData,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  Link,
  type MetaFunction,
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
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import NoDataCard from "~/components/ui/no-data-card";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { InviteUserModal } from "~/components/inviteUserModal/inviteUserModal";
import { CreatePermissionGroupDialog } from "~/components/createPermissionGroupDialog/createPermissionGroupDialog";
import { ManageUserPermissionGroupsDialog } from "~/components/manageUserPermissionGroupsDialog/manageUserPermissionGroupsDialog";
import { z } from "zod";
import { useEffect } from "react";
import { toast, Toaster } from "sonner";
import {
  getUserScopes,
  hasAccessHierarchical,
  setUserPermissionGroups,
} from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import { createInvitation } from "~/lib/auth/handleInvite.server";

dayjs.extend(relativeTime);

const inviteUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  permissionGroupIds: z
    .array(z.string())
    .min(1, "At least one permission group is required"),
});

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

type ActionData = {
  success: boolean;
  error?: string;
  message?: string;
  intent: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.edit_global_users"],
  );
  const intent = formData.get("intent");

  switch (intent) {
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

      await createInvitation(email, permissionGroupIds);
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
        await setUserPermissionGroups(user, userId, permissionGroups, "GLOBAL");

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

    default:
      return data<ActionData>(
        { success: false, intent: intent as string, error: "Invalid action" },
        { status: 400 },
      );
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.edit_global_users"],
  );

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
  const invites = await prisma.invitation.findMany({
    where: {
      permissionGroupId: {
        in: permissionGroups.map((pg) => pg.id),
      },
    },
    include: {
      permissionGroup: true,
    },
  });
  const userScopes = await getUserScopes(user);

  return {
    user,
    users,
    permissionGroups,
    userScopes,
    invites,
  };
};

const PermissionManagement = () => {
  const { user, users, permissionGroups, userScopes, invites } =
    useLoaderData<typeof loader>();
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
    <Layout navComponent={<OverviewNav userScopes={userScopes} />} user={user}>
      <div className="py-8 px-4 md:p-8 w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-medium">Permission Management</h1>
        </div>

        {/* Users Table */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-medium">Users</h2>
            <InviteUserModal
              permissionGroups={permissionGroups}
              error={actionData?.error}
            />
          </div>
          {!users || users.length === 0 ? (
            <NoDataCard
              headline="No Users Found"
              description="There are no users in the system at the moment."
            >
              <InviteUserModal
                permissionGroups={permissionGroups}
                error={actionData?.error}
              />
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
        <div className="mb-12">
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
                        <div className="truncate">{group.description}</div>
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
        {/** Invites Table */}
        {invites.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-medium mb-4">Invites</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-lg">
              View all active invites.
            </p>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Permission Group</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>{invite.email}</TableCell>
                      <TableCell>{invite.permissionGroup.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dayjs(invite.createdAt).fromNow()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
      <Toaster />
    </Layout>
  );
};

export default PermissionManagement;

export const meta: MetaFunction = () => {
  return [
    { title: "Permission Management" },
    { name: "description", content: "Manage permissions for users and groups" },
  ];
};
