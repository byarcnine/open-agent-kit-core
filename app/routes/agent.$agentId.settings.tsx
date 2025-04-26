import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  redirect,
  data,
  Form,
  useLoaderData,
  useActionData,
} from "react-router";
import { type Agent, prisma } from "@db/db.server";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { z } from "zod";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Toaster } from "~/components/ui/sonner";
import { hasAccess, hasPermission } from "~/lib/auth/hasAccess.server";
import { Switch } from "~/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { AlertTriangle } from "react-feather";
import { type ChatSettings } from "~/types/chat";
import { initialChatSettings } from "~/constants/chat";
import {
  getConfiguredModelIds,
  setModelForAgent,
} from "~/lib/llm/modelManager.server";
import { APP_URL, getConfig } from "~/lib/config/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { ModelSettings } from "~/types/llm";
import { PERMISSIONS } from "~/types/auth";
import CustomCodeEditor from "~/components/CodeEditor/CodeEditor";
import css from "css";

const AgentUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Agent name is required")
    .max(100, "Agent name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .nullable(),
  isPublic: z.boolean(),
  allowedUrls: z.array(z.string()).optional(),
});

const ChatSettingsUpdateSchema = z.object({
  enableFileUpload: z.boolean(),
  initialMessage: z.string().nullable(),
  suggestedQuestions: z.array(z.string()).nullable(),
  showMessageToolBar: z.boolean(),
  showDefaultToolsDebugMessages: z.boolean(),
  openExternalLinksInNewTab: z.boolean(),
  openInternalLinksInNewTab: z.boolean(),
  openYoutubeVideosInIframe: z.boolean(),
  customCSS: z
    .string()
    .nullable()
    .refine(
      (value) => {
        if (!value) return true; // Allow null or empty strings
        try {
          const parsedCSS = css.parse(value);
          return !parsedCSS.stylesheet?.parsingErrors?.length;
        } catch {
          return false;
        }
      },
      {
        message: "Invalid CSS syntax",
      },
    ),
  intro: z
    .object({
      title: z.string().nullable(),
      subTitle: z.string().nullable(),
    })
    .nullable(),
  textAreaInitialRows: z.number().min(1).max(5),
  footerNote: z.string().nullable(),
});

enum Intent {
  UPDATE_GENERAL_SETTINGS = "updateGeneralSettings",
  UPDATE_CHAT_SETTINGS = "updateChatSettings",
  DELETE_AGENT = "deleteAgent",
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const user = await hasAccess(request, PERMISSIONS.EDIT_AGENT, agentId);
  const agent = (await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
  })) as Agent;

  const availableModels = await getConfiguredModelIds(getConfig());

  const canDeleteAgent = await hasPermission(user, PERMISSIONS.DELETE_AGENT);

  const appUrl = APP_URL() as string;

  return { agent, user, canDeleteAgent, appUrl, availableModels };
};

const CardContentSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col space-y-3 mb-6">
      <div className="font-semibold text-md leading-none tracking-tight mb-3">
        {title}
      </div>
      {children}
    </div>
  );
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const agentId = params.agentId as string;
  const intent = formData.get("intent");
  await hasAccess(request, PERMISSIONS.EDIT_AGENT, agentId);

  // Handle delete action
  if (intent === Intent.DELETE_AGENT) {
    // required extra permission to delete the agent
    await hasAccess(request, PERMISSIONS.DELETE_AGENT, agentId);
    await prisma.agent.delete({
      where: { id: agentId },
    });
    return redirect("/");
  }
  if (intent === Intent.UPDATE_GENERAL_SETTINGS) {
    const allowedUrls =
      formData
        .get("allowedUrls")
        ?.toString()
        .split(",")
        .map((url) => url.trim())
        .filter((url) => url) || [];
    const rawInput = {
      name: formData.get("name")?.toString().trim(),
      description: formData.get("description")?.toString()?.trim() || null,
      isPublic: !!formData.get("isPublic"),
      allowedUrls,
    };

    try {
      const validatedData = AgentUpdateSchema.parse(rawInput);

      await prisma.agent.update({
        where: { id: agentId },
        data: validatedData,
      });

      if (formData.get("model")) {
        await setModelForAgent(agentId, formData.get("model") as string);
      }

      return { success: true, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return data({ errors: error.flatten().fieldErrors }, { status: 400 });
      }
      throw error;
    }
  }
  if (intent === Intent.UPDATE_CHAT_SETTINGS) {
    const parsedSuggestedQuestions = formData
      .get("suggestedQuestions")
      ?.toString()
      .split("\n")
      .map((question) => question.trim())
      .filter(Boolean);

    const rawInput = {
      enableFileUpload: !!formData.get("enableFileUpload"),
      initialMessage: formData.get("initialMessage"),
      suggestedQuestions: parsedSuggestedQuestions || [],
      intro: {
        title: formData.get("introTitle"),
        subTitle: formData.get("introSubTitle"),
      },
      textAreaInitialRows: parseInt(
        formData.get("textAreaInitialRows") as string,
        10,
      ),
      footerNote: formData.get("footerNote")?.toString() || "",
      showMessageToolBar: !!formData.get("showMessageToolBar"),
      showDefaultToolsDebugMessages: !!formData.get(
        "showDefaultToolsDebugMessages",
      ),
      openExternalLinksInNewTab: !!formData.get("openExternalLinksInNewTab"),
      openInternalLinksInNewTab: !!formData.get("openInternalLinksInNewTab"),
      openYoutubeVideosInIframe: !!formData.get("openYoutubeVideosInIframe"),
      customCSS: formData.get("customCSS")?.toString() || null,
    };
    try {
      const validatedData = ChatSettingsUpdateSchema.parse(rawInput);
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          chatSettings: JSON.stringify(validatedData),
        },
      });
      return { success: true, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return data({ errors: error.flatten().fieldErrors }, { status: 400 });
      }
      throw error;
    }
  }
  return data({ success: false, errors: null }, { status: 400 });
};

const AgentSettings = () => {
  const { agent, canDeleteAgent, appUrl, availableModels } =
    useLoaderData<typeof loader>();
  const chatSettings: ChatSettings = agent.chatSettings
    ? { ...initialChatSettings, ...JSON.parse(agent.chatSettings as string) }
    : initialChatSettings;

  const [customCSS, setCustomCSS] = useState(chatSettings?.customCSS || "");

  const actionData = useActionData<typeof action>();

  const [isPublic, setIsPublic] = useState(agent.isPublic);

  const [enableFileUpload, setEnableFileUpload] = useState(
    chatSettings?.enableFileUpload,
  );

  useEffect(() => {
    if (actionData?.errors) {
      toast.error(
        "Failed to update agent settings. Please check field errors.",
      );
    } else if (actionData) {
      toast.success("Agent settings updated successfully");
    }
  }, [actionData]);

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (
      !confirm(
        "Are you sure you want to delete this agent? This action cannot be undone.",
      )
    ) {
      e.preventDefault();
      return;
    }
  };

  return (
    <div className="w-full py-8 px-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold">Agent Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input
              type="hidden"
              name="intent"
              value={Intent.UPDATE_GENERAL_SETTINGS}
            />
            <div title="General Settings">
              <Input
                id="name"
                name="name"
                defaultValue={agent.name}
                placeholder="Enter agent name"
              />
              {actionData?.errors?.name && (
                <p className="text-sm text-red-500">
                  {actionData.errors.name[0]}
                </p>
              )}
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                className="border"
                defaultValue={agent.description || ""}
                placeholder="Enter agent description"
                rows={4}
              />
              {actionData?.errors?.description && (
                <p className="text-sm text-red-500">
                  {actionData.errors.description[0]}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-col">
              <Label htmlFor="model">Model</Label>
              <Select
                name="model"
                defaultValue={
                  (agent.modelSettings as ModelSettings)?.model || ""
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 flex-col">
              <Label htmlFor="isPublic">Public Agent</Label>
              <p className="text-sm text-muted-foreground">
                If enabled the agent is public and can be embed to websites and
                other tools.
              </p>
              <Switch
                id="isPublic"
                name="isPublic"
                defaultChecked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
            {isPublic && (
              <div className="flex flex-col space-y-2">
                <Label htmlFor="allowedUrls">Add Allowed URLs</Label>
                <Input
                  id="allowedUrls"
                  name="allowedUrls"
                  className="border"
                  defaultValue={agent.allowedUrls.join(",")}
                  placeholder="Enter allowed URLs separated by commas"
                />
                <p className="text-sm text-muted-foreground">
                  Enter allowed URLs separated by commas where the agent can be
                  embedded.
                </p>
              </div>
            )}

            <Button type="submit">Save Changes</Button>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Chat Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-4">
            <input
              type="hidden"
              name="intent"
              value={Intent.UPDATE_CHAT_SETTINGS}
            />
            <CardContentSection title="Intro Screen">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="introTitle">Intro Title</Label>
                <Input
                  id="introTitle"
                  name="introTitle"
                  defaultValue={chatSettings?.intro?.title || ""}
                  placeholder="Enter intro title"
                />
                <p className="text-sm text-muted-foreground">
                  This is the title of the chat, in case there is no intro
                  message defined. This field is optional.
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="introSubTitle">Intro SubTitle</Label>
                <Input
                  id="introSubTitle"
                  name="introSubTitle"
                  defaultValue={chatSettings?.intro?.subTitle || ""}
                  placeholder="Enter intro subTitle"
                />
                <p className="text-sm text-muted-foreground">
                  This is the subTitle of the chat, in case there is no intro
                  message defined. This field is optional.
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="name">Initial Message</Label>
                <Input
                  id="initialMessage"
                  name="initialMessage"
                  defaultValue={chatSettings?.initialMessage || ""}
                  placeholder="Enter initial message"
                />
                <p className="text-sm text-muted-foreground">
                  This message will be sent to the user when they first open the
                  chat. If you don't want to send a message, leave it blank.
                </p>
                {actionData?.errors?.initialMessage && (
                  <p className="text-sm text-red-500">
                    {actionData.errors.initialMessage[0]}
                  </p>
                )}
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="suggestedQuestions">Suggested Questions</Label>
                <Textarea
                  id="suggestedQuestions"
                  name="suggestedQuestions"
                  className="border"
                  defaultValue={
                    chatSettings?.suggestedQuestions?.join("\n") || ""
                  }
                  placeholder="Enter suggested questions line by line"
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Enter one question per line. Keep it short and concise. If you
                  don't want to provide initial questions, leave it blank.
                </p>
              </div>
            </CardContentSection>
            <CardContentSection title="Chat Input">
              <div className="flex gap-2 flex-col">
                <Label htmlFor="isPublic">Enable File Upload</Label>
                <p className="text-sm text-muted-foreground">
                  If enabled the agent can accept file uploads from the user.
                  Supported file types are images and PDFs. PDFs are currently
                  not supported when choosing an OpenAI model.
                </p>
                <Switch
                  id="enableFileUpload"
                  name="enableFileUpload"
                  defaultChecked={enableFileUpload}
                  onCheckedChange={setEnableFileUpload}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="textAreaInitialRows">Text Area Rows</Label>
                <Input
                  type="number"
                  id="textAreaInitialRows"
                  name="textAreaInitialRows"
                  className="border"
                  defaultValue={chatSettings?.textAreaInitialRows || 2}
                  placeholder="Enter number of initial rows of the text area"
                />
                <p className="text-sm text-muted-foreground">
                  Enter number of initial rows of the text area
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="footerNote">Footer Note</Label>
                <Textarea
                  id="footerNote"
                  name="footerNote"
                  className="border"
                  defaultValue={chatSettings?.footerNote || ""}
                  placeholder="Enter footer note"
                  rows={2}
                />
                <p className="text-sm text-muted-foreground">
                  Enter a note that will be displayed below the chat input.
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="showMessageToolBar">
                  Show Message Tool Bar
                </Label>
                <Switch
                  id="showMessageToolBar"
                  name="showMessageToolBar"
                  defaultChecked={chatSettings?.showMessageToolBar}
                />
                <p className="text-sm text-muted-foreground">
                  If enabled, actions like copy will be shown below the response
                  messages.
                </p>
              </div>
            </CardContentSection>
            <CardContentSection title="Message Formatting">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="showDefaultToolsDebugMessages">
                  Show Default Tools Debug Messages
                </Label>
                <Switch
                  id="showDefaultToolsDebugMessages"
                  name="showDefaultToolsDebugMessages"
                  defaultChecked={chatSettings?.showDefaultToolsDebugMessages}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="openExternalLinksInNewTab">
                  Open External Links in New Tab
                </Label>
                <Switch
                  id="openExternalLinksInNewTab"
                  name="openExternalLinksInNewTab"
                  defaultChecked={chatSettings?.openExternalLinksInNewTab}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="openInternalLinksInNewTab">
                  Open Internal Links in New Tab
                </Label>
                <Switch
                  id="openInternalLinksInNewTab"
                  name="openInternalLinksInNewTab"
                  defaultChecked={chatSettings?.openInternalLinksInNewTab}
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="openYoutubeVideosInIframe ">
                  Open Youtube Videos in Iframe
                </Label>
                <Switch
                  id="openYoutubeVideosInIframe"
                  name="openYoutubeVideosInIframe"
                  defaultChecked={chatSettings?.openYoutubeVideosInIframe}
                />
              </div>
            </CardContentSection>
            <CardContentSection title="Custom CSS">
              <div className="flex flex-col space-y-2">
                  <CustomCodeEditor
                    value={customCSS}
                    onValueChange={setCustomCSS}
                    highlight="CSS"
                  />
                  {actionData?.errors?.customCSS && (
                    <p className="text-sm text-red-500">
                      {actionData.errors.customCSS[0]}
                    </p>
                  )}
                <input
                  type="hidden"
                  id="customCSS"
                  name="customCSS"
                  value={customCSS}
                />
              </div>
            </CardContentSection>
            <Button type="submit">Save Changes</Button>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Embed Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            {!agent.isPublic && (
              <span className="text-destructive text-sm mb-2 flex items-center">
                <AlertTriangle className="inline-block mr-2" />
                Private agents are not embedable. Please make the agent public
                to embed it.
              </span>
            )}
            <p className="text-sm text-muted-foreground mb-2">
              To embed the agent in your website, you can use the following
              code:
            </p>

            <span className="mb-2 block font-bold text-sm">JS Embed</span>
            <div className="flex flex-row gap-2 mb-4">
              <code className="text-xs whitespace-pre-wrap break-all bg-zinc-200 p-4 rounded-md">
                {`
<!-- Add the container where you want to render the agent. -->
<div id="chat-container"></div>

<!-- Add the script to load the agent. -->
<script src="${appUrl}/embed/chat.bundle.umd.js"></script>

<script>
  // Initialize the chat component
  ChatComponent.renderChatComponent('chat-container', {
    agentId: "${agent.id}",
    apiUrl: "${appUrl}"
  });
</script>
    `}
              </code>
            </div>
            <span className="mb-2 block font-bold text-sm">iFrame Embed</span>
            <div className="flex flex-row gap-2 mb-4">
              <code className="text-xs whitespace-pre-wrap break-all bg-zinc-200 p-4 rounded-md">
                {`
<iframe src="${appUrl}/embed/${agent.id}" width="100%" height="100%"></iframe>
        `}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
      {canDeleteAgent && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete the agent and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form method="post">
              <input type="hidden" name="intent" value={Intent.DELETE_AGENT} />
              <Button
                variant="destructive"
                onClick={handleDelete}
                type="submit"
              >
                Delete Agent
              </Button>
            </Form>
          </CardContent>
        </Card>
      )}
      <Toaster />
    </div>
  );
};

export default AgentSettings;
