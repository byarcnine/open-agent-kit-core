import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useActionData,
  data,
  Form,
  redirect,
} from "react-router";
import { prisma } from "@db/db.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { z } from "zod";
import Layout from "~/components/layout/layout";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { SessionUser } from "~/types/auth";
import { SpaceDetailNav } from "~/components/spaceDetailNav/spaceDetailNav";
import { toast, Toaster } from "sonner";

const SpaceUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Space name is required")
    .max(100, "Space name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .nullable(),
});

enum Intent {
  UPDATE_SPACE = "updateSpace",
  DELETE_SPACE = "deleteSpace",
}

type ActionData = {
  success: boolean;
  error?: string;
  message?: string;
  intent: string;
  errors?: {
    name?: string[];
    description?: string[];
    general?: string[];
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { spaceId } = params;

  if (!spaceId) {
    return data<ActionData>({
      success: false,
      intent: "error",
      errors: { general: ["Space ID is required"] },
    });
  }

  const user = await hasAccessHierarchical(
    request,
    PERMISSION["space.edit_space"],
    spaceId,
  );

  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case Intent.UPDATE_SPACE: {
      const validationResult = SpaceUpdateSchema.safeParse({
        name: formData.get("name"),
        description: formData.get("description"),
      });

      if (!validationResult.success) {
        return data<ActionData>(
          {
            success: false,
            intent: intent as string,
            errors: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 },
        );
      }

      const { name, description } = validationResult.data;

      try {
        await prisma.space.update({
          where: { id: spaceId },
          data: {
            name,
            description,
          },
        });

        return data<ActionData>(
          {
            success: true,
            intent: intent as string,
            message: "Space updated successfully",
          },
          { status: 200 },
        );
      } catch (error) {
        console.error(error);
        return data<ActionData>(
          {
            success: false,
            intent: intent as string,
            error: "Failed to update space",
          },
          { status: 500 },
        );
      }
    }

    case Intent.DELETE_SPACE: {
      // Check for delete permission
      await hasAccessHierarchical(
        request,
        PERMISSION["space.delete_space"],
        spaceId,
      );

      try {
        await prisma.space.delete({
          where: { id: spaceId },
        });
        return redirect("/");
      } catch (error) {
        console.error(error);
        return data<ActionData>(
          {
            success: false,
            intent: intent as string,
            error: "Failed to delete space",
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

  const userScopes = await getUserScopes(user);

  const userCanDelete = userScopes.some(
    (p) => p.scope === "space.delete_space" && p.referenceId === spaceId,
  );

  return {
    space,
    userCanDelete,
  };
};

const SpaceSettings = () => {
  const { space, userCanDelete } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  useEffect(() => {
    if (actionData && "success" in actionData && actionData.success) {
      toast.success(actionData.message);
    }
    if (actionData && "error" in actionData && actionData.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (
      !confirm(
        "Are you sure you want to delete this space and all associated agents? THIS CAN NOT BE UNDONE",
      )
    ) {
      e.preventDefault();
      return;
    }
  };

  return (
    <>
      <Toaster />
      <div className="py-8 px-4 md:p-8 w-full mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-medium">{space.name} - Settings</h1>
            <p className="text-muted-foreground">
              Manage space settings and configuration
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Update your space name and description
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4 mt-4">
                <input
                  type="hidden"
                  name="intent"
                  value={Intent.UPDATE_SPACE}
                />
                <div className="flex flex-col gap-2 mb-8">
                  <Label htmlFor="name">Space Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={space.name}
                    placeholder="Enter space name"
                  />
                  {actionData?.errors?.name && (
                    <p className="text-sm text-red-500">
                      {actionData.errors.name[0]}
                    </p>
                  )}
                </div>
                <div className="flex flex-col space-y-2 mb-8">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    className="border"
                    defaultValue={space.description || ""}
                    placeholder="Enter space description"
                    rows={4}
                  />
                  {actionData?.errors?.description && (
                    <p className="text-sm text-red-500">
                      {actionData.errors.description[0]}
                    </p>
                  )}
                </div>
                <Button type="submit">Save Changes</Button>
              </Form>
            </CardContent>
          </Card>

          {userCanDelete && (
            <Card className="max-w-3xl border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Permanently delete the space and all associated agents. THIS
                  CAN NOT BE UNDONE
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form method="post">
                  <input
                    type="hidden"
                    name="intent"
                    value={Intent.DELETE_SPACE}
                  />
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    type="submit"
                  >
                    Delete Space
                  </Button>
                </Form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default SpaceSettings;

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `${data?.space?.name} - Settings | OAK Dashboard` },
    {
      name: "description",
      content: "Manage space settings and configuration",
    },
  ];
};
