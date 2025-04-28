import { GlobalUserRole, InvitationType } from "@prisma/client";
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
} from "react-router";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import { prisma } from "@db/db.server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { Trash2 } from "react-feather";
import { InviteUserModal } from "~/components/inviteUserModal/inviteUserModal";
import { z } from "zod";
import { sendInvitationEmail } from "~/lib/email/sendInvitationEmail.server";
import { useEffect } from "react";
import { toast, Toaster } from "sonner";
import { Select } from "@radix-ui/react-select";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PERMISSIONS, type SessionUser } from "~/types/auth";
import NoDataCard from "~/components/ui/no-data-card";
import {
  getLicenseFromSettings,
  getUsageStats,
  MAX_AGENTS,
  MAX_DOCUMENTS,
  MAX_USERS,
  needsLicense,
  setLicense,
} from "~/lib/license/license.server";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { APP_URL, getVersion } from "~/lib/config/config";
import { cn } from "~/lib/utils";
import CopyToClipboardLink from "~/components/copyToClipboardLink/copyToClipboardLink";
import { GLOBAL_ROLES } from "~/lib/auth/roles";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccess(request, PERMISSIONS.EDIT_GLOBAL_SETTINGS);
  const globalUsersPromise = prisma.user.findMany({
    where: {
      role: {
        not: "VIEW_EDIT_ASSIGNED_AGENTS",
      },
    },
    orderBy: {
      email: "asc",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
  const generalUsersPromise = prisma.user.findMany({
    where: {
      role: "VIEW_EDIT_ASSIGNED_AGENTS",
    },
    orderBy: {
      email: "asc",
    },
    select: {
      userAgents: {
        include: {
          agent: true,
        },
      },
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });
  const globalInvitesPromise = prisma.invitation
    .findMany({
      where: {
        type: InvitationType.GLOBAL,
      },
    })
    .then((invites) =>
      invites.map((invite) => ({
        ...invite,
        link: `${APP_URL()}/invite/${invite.id}`,
      }))
    );
  const licensePromise = getLicenseFromSettings();
  const usageStatsPromise = getUsageStats();
  const [
    globalUsers,
    generalUsers,
    license,
    usageStats,
    licenseNeeded,
    globalInvites,
  ] = await Promise.all([
    globalUsersPromise,
    generalUsersPromise,
    licensePromise,
    usageStatsPromise,
    needsLicense(),
    globalInvitesPromise,
  ]);
  const version = getVersion();
  return {
    user: user as SessionUser,
    globalUsers,
    generalUsers,
    license,
    version,
    usageStats,
    MAX_USERS,
    MAX_AGENTS,
    MAX_DOCUMENTS,
    licenseNeeded,
    globalInvites,
  };
};

type ActionData = {
  success: boolean;
  error?: string;
  message?: string;
  intent: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const inviteUserSchema = z.object({
    email: z.string().email("Invalid email address"),
    role: z.enum(["SUPER_ADMIN", "EDIT_ALL_AGENTS", "VIEW_ALL_AGENTS"]),
  });

  const formData = await request.formData();
  await hasAccess(request, PERMISSIONS.EDIT_GLOBAL_SETTINGS);
  const intent = formData.get("intent");

  switch (intent) {
    case "deleteUser": {
      const userId = formData.get("userId");
      await prisma.user.delete({
        where: { id: userId as string },
      });
      return data<ActionData>({
        success: true,
        intent,
        message: "User deleted successfully",
      });
    }

    case "invite": {
      const result = inviteUserSchema.safeParse({
        email: formData.get("email"),
        role: formData.get("role"),
      });

      if (!result.success) {
        return data<ActionData>(
          { success: false, intent, error: result.error.issues[0].message },
          { status: 400 }
        );
      }

      const { email, role } = result.data;

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return data<ActionData>(
          { success: false, intent, error: "User already exists" },
          { status: 400 }
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
        { success: true, intent, message: "Invitation sent successfully" },
        { status: 200 }
      );
    }
    case "updateRole": {
      const userId = formData.get("userId");
      const role = formData.get("role") as GlobalUserRole;
      await prisma.user.update({
        where: { id: userId as string },
        data: { role: role },
      });
      return data<ActionData>(
        { success: true, intent, message: "Role updated successfully" },
        { status: 200 }
      );
    }
    case "addLicense": {
      const license = formData.get("license");
      try {
        await setLicense(license as string);
        return data<ActionData>(
          { success: true, intent, message: "License added successfully" },
          { status: 200 }
        );
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        console.error(errorMessage);
        return data<ActionData>(
          { success: false, intent, error: errorMessage },
          { status: 400 }
        );
      }
    }
  }
};

const DeleteUserButton = ({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    if (!confirm(`Are you sure you want to delete user ${userName}?`)) {
      e.preventDefault();
    }
  };
  return (
    <Form method="delete" onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="intent" value="deleteUser" />
      <Button type="submit" variant="destructive" size="icon">
        <Trash2 className="w-4 h-4" />
      </Button>
    </Form>
  );
};

const Settings = () => {
  const {
    user,
    globalUsers,
    generalUsers,
    license,
    version,
    usageStats,
    MAX_AGENTS,
    MAX_DOCUMENTS,
    MAX_USERS,
    licenseNeeded,
    globalInvites,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const roleFetcher = useFetcher<{ success: boolean; message?: string }>();

  useEffect(() => {
    if (roleFetcher.data) {
      toast.success(roleFetcher.data.message);
    }
  }, [roleFetcher.data]);

  useEffect(() => {
    if (actionData && actionData.intent === "invite") {
      toast.success(actionData.message);
    }
    if (actionData && actionData.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  return (
    <Layout navComponent={<OverviewNav user={user} />} user={user}>
      <div className="w-full py-8 px-4 md:p-8 flex flex-col">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-medium">Global Settings</h1>
            <p className="text-muted-foreground text-sm">Version {version}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="rounded border p-4">
            <div className="flex items-center flex-wrap gap-2 mb-4">
              <h2 className="text-lg font-medium">Manage License</h2>
              <div className="flex gap-2">
                {license.valid && (
                  <Badge className="bg-oak-green block">Valid</Badge>
                )}
                {!license.valid && licenseNeeded && (
                  <Badge className="bg-destructive">Invalid</Badge>
                )}
              </div>
            </div>
            <Form method="post" className="flex gap-4 items-end">
              <div className="flex-1 flex flex-wrap gap-2 items-end">
                <div>
                  <label
                    htmlFor="license"
                    className="block text-sm font-medium mb-2"
                  >
                    License Key
                  </label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Enter your license key to activate the license. If you don't
                    have a license key, please purchase one at{" "}
                    <a
                      href="https://open-agent-kit.com"
                      target="_blank"
                      className="underline hover:no-underline"
                      rel="noopener noreferrer"
                    >
                      open-agent-kit.com
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      id="license"
                      defaultValue={license.licenseKey}
                      name="license"
                      placeholder="License"
                      required
                      className="max-w-xs"
                    />
                    <input type="hidden" name="intent" value="addLicense" />
                    <Button type="submit">Activate License</Button>
                  </div>
                </div>
              </div>
            </Form>
            <div className="gap-2 float-left pt-4">
              <div className="flex flex-col gap-2">
                <Badge
                  className={cn("block", {
                    "bg-oak-green":
                      usageStats.userCount <= MAX_USERS || license.valid,
                    "bg-red-400":
                      usageStats.userCount > MAX_USERS && !license.valid,
                  })}
                >
                  User: {usageStats.userCount} /{" "}
                  {license.valid ? "∞" : MAX_USERS}
                </Badge>
                <Badge
                  className={cn("block", {
                    "bg-oak-green":
                      usageStats.agentCount <= MAX_AGENTS || license.valid,
                    "bg-red-400":
                      usageStats.agentCount > MAX_AGENTS && !license.valid,
                  })}
                >
                  Agents: {usageStats.agentCount} /{" "}
                  {license.valid ? "∞" : MAX_AGENTS}
                </Badge>
                <Badge
                  className={cn("block", {
                    "bg-oak-green":
                      usageStats.documentsCount <= MAX_DOCUMENTS ||
                      license.valid,
                    "bg-red-400":
                      usageStats.documentsCount > MAX_DOCUMENTS &&
                      !license.valid,
                  })}
                >
                  Documents: {usageStats.documentsCount} /{" "}
                  {license.valid ? "∞" : MAX_DOCUMENTS}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <div className="my-6 rounded border p-4">
          <div className="flex flex-col mb-4 gap-2">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-medium">Global Users</h2>
              {user.role === "SUPER_ADMIN" && (
                <InviteUserModal
                  roles={GLOBAL_ROLES}
                  error={actionData?.error}
                />
              )}
            </div>
            <p className="text-muted-foreground text-sm max-w-lg">
              Manage all global users and their roles here. A user can either be
              a &quot;Super Admin&quot;, an &quot;Edit All Agents&quot; user, or
              a &quot;View All Agents&quot; user.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {globalUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <roleFetcher.Form method="post" className="w-32">
                      <input type="hidden" name="userId" value={u.id} />
                      <input type="hidden" name="intent" value="updateRole" />
                      <Select
                        name="role"
                        disabled={user.id === u.id}
                        value={u.role}
                        onValueChange={(value) => {
                          roleFetcher.submit(
                            {
                              userId: u.id,
                              role: value,
                              intent: "updateRole",
                            },
                            { method: "post" }
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SUPER_ADMIN">
                            Super Admin
                          </SelectItem>
                          <SelectItem value="EDIT_ALL_AGENTS">
                            Edit All Agents
                          </SelectItem>
                          <SelectItem value="VIEW_ALL_AGENTS">
                            View All Agents
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </roleFetcher.Form>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.id !== u.id && (
                      <DeleteUserButton userId={u.id} userName={u.name} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4">
            <h2 className="text-lg font-medium mb-2">Invites</h2>
            <p className="text-muted-foreground text-sm max-w-lg">
              Pending invites are not yet accepted by the user.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Invite Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {globalInvites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>{invite.email}</TableCell>
                  <TableCell>
                    {
                      GLOBAL_ROLES.find((r) => r.name === invite.globalRole)
                        ?.label
                    }
                  </TableCell>
                  <TableCell>
                    {invite.createdAt.toLocaleDateString()}{" "}
                    {invite.createdAt.toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    <CopyToClipboardLink link={invite.link} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="rounded border p-4">
          <div className="flex flex-col mb-4 gap-2">
            <h2 className="text-lg font-medium">Agent Users</h2>
            <p className="text-muted-foreground text-sm max-w-lg">
              Agent user are specific to agents and can be added within the
              agent. They can only view and edit the assigned agents.
            </p>
          </div>
          {generalUsers.length === 0 && (
            <NoDataCard
              headline="No Agent Users found"
              description="There are no agent users at the moment. Add one by inviting a user to an agent."
            />
          )}
          {generalUsers.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Agent(s)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generalUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.userAgents
                        .map((userAgent) => userAgent.agent.name)
                        .join(", ")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteUserButton userId={user.id} userName={user.name} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Toaster />
    </Layout>
  );
};

export default Settings;
