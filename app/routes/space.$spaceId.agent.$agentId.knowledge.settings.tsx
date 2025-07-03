import {
  Form,
  useLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  data,
} from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useEffect, useState } from "react";
import { Trash2, Edit, Plus } from "react-feather";
import { prisma } from "@db/db.server";
import { Badge } from "~/components/ui/badge";
import { sessionStorage } from "~/lib/sessions.server";
import ColorPicker from "~/components/ui/colorPicker";
import { toast, Toaster } from "sonner";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";

enum Intent {
  CREATE_TAG = "createTag",
  UPDATE_TAG = "updateTag",
  DELETE_TAG = "deleteTag",
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const agentId = params.agentId as string;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const tagId = formData.get("tagId") as string;
  const tagName = formData.get("tagName") as string;
  const tagColor = formData.get("tagColor") as string;
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  await hasAccessHierarchical(request, PERMISSION["agent.edit_agent"], agentId);
  try {
    if (intent === Intent.CREATE_TAG) {
      await prisma.knowledgeDocumentTag.create({
        data: { agentId, name: tagName, color: tagColor },
      });
    } else if (intent === Intent.UPDATE_TAG) {
      await prisma.knowledgeDocumentTag.update({
        where: { id: tagId },
        data: { name: tagName, color: tagColor },
      });
    } else if (intent === Intent.DELETE_TAG) {
      await prisma.knowledgeDocumentTag.delete({ where: { id: tagId } });
    }
    return data(
      { success: true },
      {
        headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint failed")) {
        session.flash("message", {
          heading: "Tag already exists",
          type: "error",
        });
      } else {
        session.flash("message", {
          heading: error.message,
          type: "error",
        });
      }
    } else {
      session.flash("message", {
        heading: "Failed to process data",
        type: "error",
      });
    }
    return data(
      { success: false },
      {
        headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
      },
    );
  }
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const tags = await prisma.knowledgeDocumentTag.findMany({
    where: { agentId },
  });
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  const message = session.get("message");
  return data(
    { tags, message },
    { headers: { "Set-Cookie": await sessionStorage.commitSession(session) } },
  );
};

const SettingsTab = () => {
  const loaderData = useLoaderData();
  const { tags, message } = loaderData;

  useEffect(() => {
    if (message) {
      if (message.type === "success") {
        toast.success(message.heading);
      } else {
        toast.error(message.heading);
      }
    }
  }, [message]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Document Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <TagSettingsForm tags={tags} />
        </CardContent>
      </Card>
      <Toaster expand={true} />
    </>
  );
};

export default SettingsTab;

const TAG_DEFAULT_COLORS = [
  "#FFB3BA",
  "#FFDFBA",
  "#FFFFBA",
  "#BAFFC9",
  "#BAE1FF",
  "#E1BAFF",
  "#FFB3E6",
  "#B3FFE6",
  "#FFE6B3",
];

type Tag = {
  id?: string;
  name: string;
  color?: string;
};

function TagSettingsForm({ tags }: { tags: Tag[] }) {
  const [currentTag, setCurrentTag] = useState<Tag>({
    name: "",
    color: "#fff",
  });

  const handleSubmit = (event: React.FormEvent) => {
    setCurrentTag({ name: "", color: "#fff" });
  };

  const handleCancel = () => {
    setCurrentTag({ name: "", color: "#fff" });
  };

  return (
    <div className="space-y-4">
      <Form
        method="post"
        id="tagForm"
        className="space-y-2"
        onSubmit={handleSubmit}
      >
        <div className="flex space-x-2 items-center">
          <Input
            name="tagName"
            placeholder="Tag name"
            value={currentTag.name}
            onChange={(e) =>
              setCurrentTag({ ...currentTag, name: e.target.value })
            }
            className="flex-1"
          />
          <ColorPicker
            value={currentTag.color || "#ffffff"}
            onChange={(color) => setCurrentTag({ ...currentTag, color })}
            colorPalette={TAG_DEFAULT_COLORS}
          />
          <input
            type="hidden"
            name="intent"
            value={currentTag.id ? Intent.UPDATE_TAG : Intent.CREATE_TAG}
          />
          <input type="hidden" name="tagId" value={currentTag.id || ""} />
          <input type="hidden" name="tagColor" value={currentTag.color || ""} />
          {currentTag.id && (
            <Button
              variant="secondary"
              type="button"
              onClick={handleCancel}
              className="flex items-center space-x-1"
            >
              <span>Cancel</span>
            </Button>
          )}
          <Button
            variant="default"
            type="submit"
            className="flex items-center space-x-1"
          >
            {currentTag.id ? (
              <Edit className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{currentTag.id ? "Save" : "Add"}</span>
          </Button>
        </div>
      </Form>

      <div className="mt-4 flex flex-wrap gap-4">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            className="flex items-center justify-between p-0.5"
            variant="secondary"
            style={{ backgroundColor: tag.color }}
          >
            <span className="text-sm px-3 font-medium">{tag.name}</span>
            <div className="flex space-x-2">
              <Button
                variant="link"
                size="sm"
                onClick={() => setCurrentTag(tag)}
                className="flex items-center m-0 p-1 text-gray-700 hover:text-black"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Form method="post">
                <input type="hidden" name="intent" value={Intent.DELETE_TAG} />
                <input type="hidden" name="tagId" value={tag.id} />
                <Button
                  type="submit"
                  variant="link"
                  size="sm"
                  className="text-red-500 flex items-center p-1 hover:text-red-700"
                  onClick={(e) => {
                    if (!confirm("Are you sure you want to delete this tag?")) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </Form>
            </div>
          </Badge>
        ))}
      </div>
    </div>
  );
}
