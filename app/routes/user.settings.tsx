import {
  data,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  Form,
  useLoaderData,
  useActionData,
} from "react-router";
import { Button } from "~/components/ui/button";
import { prisma } from "@db/db.server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useEffect } from "react";
import { toast, Toaster } from "sonner";
import { sessionStorage } from "~/lib/sessions.server";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import Layout from "~/components/layout/layout";
import { authClient } from "~/lib/auth/auth.client";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { SessionUser } from "~/types/auth";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.edit_global_users"],
  );
  return data({ user: user as SessionUser });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.edit_global_users"],
  );

  const formData = await request.formData();
  const intent = formData.get("intent");
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );

  if (intent === "updateName") {
    const name = formData.get("name");
    if (typeof name !== "string" || !name) {
      throw new Error("Name is required");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { name },
    });

    return data(
      { success: true, intent },
      {
        headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
      },
    );
  }
};

const UserSettings = () => {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<{
    success: boolean;
    intent: string;
    error?: string;
    message?: string;
  }>();

  useEffect(() => {
    if (actionData?.success && actionData.intent === "updateName") {
      toast.success("Your name has been updated successfully");
    }
    if (actionData?.success && actionData.intent === "updatePassword") {
      toast.success("Your password has been updated successfully");
    }
    if (actionData?.error) {
      toast.error(actionData.error, {
        style: { backgroundColor: "red", color: "white" },
      });
    }
  }, [actionData]);

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (
      confirm(
        "Are you sure you want to delete your account? This action cannot be undone.",
      )
    ) {
      authClient.deleteUser().then(() => {
        window.location.href = "/";
      });
      return;
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match");
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error("All password fields are required");
    }
    await authClient.changePassword({
      newPassword: newPassword as string,
      currentPassword: currentPassword as string,
      revokeOtherSessions: true, // revoke all other sessions the user is signed into
    });
    toast.success("Password updated successfully");
  };

  return (
    <Layout user={user} navComponent={<OverviewNav user={user} />}>
      <div className="space-y-6 w-full py-8 px-4 md:p-8 overflow-auto">
        <h1 className="text-3xl font-medium">Personal Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  defaultValue={user.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  type="email"
                  disabled
                  id="email"
                  name="email"
                  defaultValue={user.email}
                />
              </div>
              <input type="hidden" name="intent" value="updateName" />
              <Button type="submit">Save Changes</Button>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form
              method="post"
              onSubmit={handlePasswordUpdate}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required
                />
              </div>
              <input type="hidden" name="intent" value="updatePassword" />
              <Button type="submit">Update Password</Button>
            </Form>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <Button
                variant="destructive"
                onClick={handleDelete}
                type="submit"
              >
                Delete Account
              </Button>
            </Form>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    </Layout>
  );
};

export default UserSettings;
