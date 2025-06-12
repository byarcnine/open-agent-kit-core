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
import { Switch } from "~/components/ui/switch";
import { Slider } from "~/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Activity,
  AlertTriangle,
  Book,
  Code,
  Link,
  Lock,
  MessageCircle,
  Power,
  Settings,
  Video,
} from "react-feather";
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
import CustomCodeEditor from "~/components/codeEditor/codeEditor";
import css from "css";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import { cn } from "~/lib/utils";
import type { AgentSettings } from "~/types/agentSetting";
import { initialAgentSettings } from "~/constants/agentSettings";

const AgentUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Agent name is required")
    .max(100, "Agent name must be less than 100 characters"),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .nullable(),
  temperature: z.number().min(0).max(1).optional(),
});

const AgentSettingsUpdateSchema = z.object({
  isPublic: z.boolean(),
  isActive: z.boolean().optional(),
  allowedUrls: z.array(z.string()).optional(),
  agentSettings: z.object({
    hasKnowledgeBase: z.boolean(),
    captureFeedback: z.boolean(),
    trackingEnabled: z.boolean(),
  }),
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

const EmbedSettingsUpdateSchema = z.object({
  maintainConversationSession: z.number().optional(),
  embedWidgetTitle: z.string().optional(),
});

enum Intent {
  UPDATE_GENERAL_SETTINGS = "updateGeneralSettings",
  UPDATE_AGENT_SETTINGS = "updateAgentSettings",
  UPDATE_CHAT_SETTINGS = "updateChatSettings",
  UPDATE_EMBED_SETTINGS = "updateEmbedSettings",
  DELETE_AGENT = "deleteAgent",
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["agent.edit_agent"],
    agentId,
  );
  const agent = (await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
  })) as Agent;

  const availableModels = await getConfiguredModelIds(getConfig());

  const canDeleteAgent = true; // TODO: add specific permission to delete agent

  const appUrl = APP_URL() as string;

  return { agent, user, canDeleteAgent, appUrl, availableModels };
};

const CardContentSection = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className={className}>
      <div className="flex flex-col space-y-6 mb-6">{children}</div>
    </div>
  );
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const agentId = params.agentId as string;
  const intent = formData.get("intent");
  await hasAccessHierarchical(request, PERMISSION["agent.edit_agent"], agentId);

  // Fetch current agent data to access modelSettings
  const currentAgent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { modelSettings: true, chatSettings: true },
  });

  // Handle delete action
  if (intent === Intent.DELETE_AGENT) {
    // required extra permission to delete the agent
    await hasAccessHierarchical(
      request,
      PERMISSION["agent.edit_agent"],
      agentId,
    );
    await prisma.agent.delete({
      where: { id: agentId },
    });
    return redirect("/");
  }

  if (intent === Intent.UPDATE_GENERAL_SETTINGS) {
    const rawInput = {
      name: formData.get("name")?.toString().trim(),
      description: formData.get("description")?.toString()?.trim() || null,
      temperature: formData.get("temperature")
        ? parseFloat(formData.get("temperature") as string)
        : undefined,
    };

    try {
      const validatedData = AgentUpdateSchema.parse(rawInput);

      await prisma.agent.update({
        where: { id: agentId },
        data: {
          name: validatedData.name,
          description: validatedData.description,
          modelSettings: {
            update: {
              temperature: validatedData.temperature ?? 0.7,
              model: formData.get("model")?.toString() || null,
            },
          },
        },
      });
      if (formData.get("model")) {
        await setModelForAgent(
          agentId,
          formData.get("model") as string,
          validatedData.temperature,
        );
      }

      return { success: true, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("update general error", error);
        return data({ errors: error.flatten().fieldErrors }, { status: 400 });
      }
      throw error;
    }
  }

  if (intent == Intent.UPDATE_AGENT_SETTINGS) {
    const allowedUrls =
      formData
        .get("allowedUrls")
        ?.toString()
        .split(",")
        .map((url) => url.trim())
        .filter((url) => url) || [];
    const rawInput = {
      isPublic: !!formData.get("isPublic"),
      isActive: !!formData.get("isActive"),
      allowedUrls,
      agentSettings: {
        hasKnowledgeBase: !!formData.get("hasKnowledgeBase"),
        captureFeedback: !!formData.get("captureFeedback"),
        trackingEnabled: !!formData.get("trackingEnabled"),
      },
    };

    try {
      const validatedData = AgentSettingsUpdateSchema.parse(rawInput);

      await prisma.agent.update({
        where: { id: agentId },
        data: {
          isPublic: validatedData.isPublic,
          isActive: validatedData.isActive,
          allowedUrls: validatedData.allowedUrls,
          agentSettings: JSON.stringify({
            hasKnowledgeBase: validatedData.agentSettings.hasKnowledgeBase,
            captureFeedback: validatedData.agentSettings.captureFeedback,
            trackingEnabled: validatedData.agentSettings.trackingEnabled,
          }),
        },
      });
      return { success: true, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("update general error", error);
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
      maintainConversationSession: formData.get("maintainConversationSession")
        ? parseInt(formData.get("maintainConversationSession") as string)
        : undefined,
    };
    try {
      const validatedData = ChatSettingsUpdateSchema.parse(rawInput);
      const chatSettings = JSON.parse(currentAgent?.chatSettings as string);
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          chatSettings: JSON.stringify({
            ...chatSettings,
            ...validatedData,
          }),
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
  if (intent === Intent.UPDATE_EMBED_SETTINGS) {
    const rawInput = {
      maintainConversationSession: formData.get("maintainConversationSession")
        ? parseInt(formData.get("maintainConversationSession") as string)
        : undefined,
      embedWidgetTitle: formData.get("embedWidgetTitle")?.toString() || "",
    };
    try {
      const validatedData = EmbedSettingsUpdateSchema.parse(rawInput);
      const chatSettings = JSON.parse(currentAgent?.chatSettings as string);
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          chatSettings: JSON.stringify({
            ...chatSettings,
            embedSettings: validatedData,
          }),
        },
      });
      return { success: true, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return data({ errors: error.flatten().fieldErrors }, { status: 400 });
      }
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

  const agentSettings: AgentSettings = agent.agentSettings
    ? {
        ...initialAgentSettings,
        ...JSON.parse(agent.agentSettings as string),
      }
    : initialAgentSettings;

  const [chatSettingsTab, setChatSettingsTab] = useState<string>("intro");

  const [customCSS, setCustomCSS] = useState(chatSettings?.customCSS || "");
  const [temperature, setTemperature] = useState(
    (agent.modelSettings as ModelSettings)?.temperature ?? 0.7,
  );

  const actionData = useActionData<typeof action>();

  const [isPublic, setIsPublic] = useState(agent.isPublic);
  const [isActive, setIsActive] = useState(agent.isActive || false);

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
    <div className="w-full py-8 px-4 md:p-8 space-y-6 max-w-6xl">
      <h1 className="text-3xl mb-6">Agent Settings</h1>
      <Tabs defaultValue="general" className="w-auto">
        <TabsList className="grid w-full max-w-xl grid-cols-5 mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="embed">Embed</TabsTrigger>
          {canDeleteAgent && (
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="general">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4 mt-4">
                <input
                  type="hidden"
                  name="intent"
                  value={Intent.UPDATE_GENERAL_SETTINGS}
                />
                <div
                  title="General Settings"
                  className="flex flex-col gap-2 mb-8"
                >
                  <Label htmlFor="description">Agent Name</Label>
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
                <div className="flex flex-col space-y-2 mb-8">
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
                <div className="flex gap-2 flex-col mb-8">
                  <Label htmlFor="model">Model</Label>
                  <Select
                    name="model"
                    defaultValue={
                      (agent.modelSettings as ModelSettings)?.model || undefined
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
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="flex items-center" htmlFor="temperature">
                      Model Temperature{" "}
                      <span className="text-xs ml-2 bg-neutral-200 py-1 px-2 rounded-xl">
                        0.7 recommended
                      </span>
                    </Label>

                    <span className="text-xs h-[35px] aspect-square bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center">
                      {temperature.toFixed(1)}
                    </span>
                  </div>
                  <div className="relative flex items-center space-x-2 my-4">
                    <Slider
                      id="temperature"
                      name="temperature"
                      defaultValue={[temperature]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={(newVal: number[]) =>
                        setTemperature(newVal[0])
                      }
                    />
                  </div>
                  <div className="flex justify-between mb-4">
                    <p className="text-xs text-muted-foreground">
                      More focused and deterministic
                    </p>
                    <p className="text-xs text-muted-foreground">
                      More creative and random
                    </p>
                  </div>
                  {actionData?.errors?.temperature && (
                    <p className="text-sm text-red-500">
                      {actionData.errors.temperature[0]}
                    </p>
                  )}
                </div>

                <Button className="mt-4" type="submit">
                  Save Changes
                </Button>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>
                Configure agent settings such as public access, activity, and
                allowed URLs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post" className="">
                <input
                  type="hidden"
                  name="intent"
                  value={Intent.UPDATE_AGENT_SETTINGS}
                />
                <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl mb-4">
                  <div
                    className={cn(" rounded-xl aspect-square p-3", {
                      "bg-green-500 text-white": isActive,
                      "bg-gray-200": !isActive,
                    })}
                  >
                    <Power size={20} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="isActive">Active Agent</Label>
                    <p className="text-sm text-muted-foreground">
                      If enabled the agent is active and can be used in chats.
                      If disabled, the agent will not be available for use.
                    </p>
                  </div>
                  <Switch
                    className="ml-auto"
                    id="isActive"
                    name="isActive"
                    defaultChecked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
                <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                  <div className="bg-white rounded-xl aspect-square p-3">
                    <Lock size={20} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="isPublic">Public Agent</Label>
                    <p className="text-sm text-muted-foreground">
                      If enabled the agent is public and can be embed to
                      websites and other tools.
                    </p>
                  </div>
                  <Switch
                    className="ml-auto"
                    id="isPublic"
                    name="isPublic"
                    defaultChecked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>
                {isPublic && (
                  <div className="flex flex-col space-y-2 pt-4">
                    <Label htmlFor="allowedUrls">Add Allowed URLs</Label>
                    <Input
                      id="allowedUrls"
                      name="allowedUrls"
                      className="border"
                      defaultValue={agent.allowedUrls.join(",")}
                      placeholder="Enter allowed URLs separated by commas"
                    />
                    <p className="text-xs text-muted-foreground max-w-lg">
                      URLs where the agent can be embedded. Seperate multiple
                      URLs with commas. If you want to allow all URLs, leave
                      this field empty.
                    </p>
                  </div>
                )}
                <div className="my-8 flex flex-col gap-2">
                  <div className="font-medium text-sm">Agent Capabilities</div>
                  <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                    <div className="bg-white rounded-xl aspect-square p-3">
                      <Book size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="hasKnowledgeBase">Knowledge Base</Label>
                      <p className="text-sm text-muted-foreground">
                        If enabled the agent can access the knowledge base to
                        answer questions. This is useful for agents that need to
                        provide information from a specific domain or context.
                      </p>
                    </div>
                    <Switch
                      className="ml-auto"
                      id="hasKnowledgeBase"
                      name="hasKnowledgeBase"
                      defaultChecked={agentSettings.hasKnowledgeBase}
                    />
                  </div>
                  <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                    <div className="bg-white rounded-xl aspect-square p-3">
                      <MessageCircle size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="captureFeedback">Capture Feedback</Label>
                      <p className="text-sm text-muted-foreground">
                        If enabled the agent will capture feedback from users
                        and store it in the database. This is useful for
                        improving the agent's performance and understanding user
                        needs.
                      </p>
                    </div>
                    <Switch
                      className="ml-auto"
                      id="captureFeedback"
                      name="captureFeedback"
                      defaultChecked={agentSettings.captureFeedback}
                    />
                  </div>
                  <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                    <div className="bg-white rounded-xl aspect-square p-3">
                      <Activity size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="trackingEnabled">
                        Conversation Tracking
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        If enabled the agent will track conversations and store
                        them in the database. This is useful for analyzing user
                        interactions and improving the agent's performance.
                      </p>
                    </div>
                    <Switch
                      className="ml-auto"
                      id="trackingEnabled"
                      name="trackingEnabled"
                      defaultChecked={agentSettings.trackingEnabled}
                    />
                  </div>
                </div>
                <Button className="mt-4" type="submit">
                  Save Changes
                </Button>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Chat Settings</CardTitle>
              <Tabs
                defaultValue={chatSettingsTab}
                value={chatSettingsTab}
                onValueChange={setChatSettingsTab}
                className="w-full max-w-md"
              >
                <TabsList>
                  <TabsTrigger value="intro">Introduction</TabsTrigger>
                  <TabsTrigger value="chat_input">Chat Input</TabsTrigger>
                  <TabsTrigger value="formatting">Formatting</TabsTrigger>
                  <TabsTrigger value="custom_css">Custom CSS</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4">
                <input
                  type="hidden"
                  name="intent"
                  value={Intent.UPDATE_CHAT_SETTINGS}
                />
                <CardContentSection
                  className={cn({
                    hidden: chatSettingsTab !== "intro",
                  })}
                >
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="introTitle">Title</Label>
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
                    <Label htmlFor="introSubTitle">Subtitle</Label>
                    <Input
                      id="introSubTitle"
                      name="introSubTitle"
                      defaultValue={chatSettings?.intro?.subTitle || ""}
                      placeholder="Enter intro subTitle"
                    />
                    <p className="text-sm text-muted-foreground">
                      This is the subTitle of the chat, in case there is no
                      intro message defined. This field is optional.
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
                      This message will be sent to the user when they first open
                      the chat. If you don't want to send a message, leave it
                      blank.
                    </p>
                    {actionData?.errors?.initialMessage && (
                      <p className="text-sm text-red-500">
                        {actionData.errors.initialMessage[0]}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="suggestedQuestions">
                      Suggested Questions
                    </Label>
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
                      Enter one question per line. Keep it short and concise. If
                      you don't want to provide initial questions, leave it
                      blank.
                    </p>
                  </div>
                </CardContentSection>

                <CardContentSection
                  className={cn({
                    hidden: chatSettingsTab !== "chat_input",
                  })}
                >
                  <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                    <div className="bg-white rounded-xl aspect-square p-3">
                      <Book size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="enableFileUpload">
                        Enable File Upload
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        If enabled the agent can accept file uploads from the
                        user. Supported file types are images and PDFs. PDFs are
                        currently not supported when choosing an OpenAI model.
                      </p>
                    </div>
                    <Switch
                      className="ml-auto"
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
                </CardContentSection>

                <CardContentSection
                  className={cn({
                    hidden: chatSettingsTab !== "formatting",
                  })}
                >
                  <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                    <div className="bg-white rounded-xl aspect-square p-3">
                      <MessageCircle size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="showMessageToolBar">
                        Show Message Tool Bar
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        If enabled, actions like copy will be shown below the
                        response messages.
                      </p>
                    </div>
                    <Switch
                      className="ml-auto"
                      id="showMessageToolBar"
                      name="showMessageToolBar"
                      defaultChecked={chatSettings?.showMessageToolBar}
                    />
                  </div>
                  <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                    <div className="bg-white rounded-xl aspect-square p-3">
                      <Code size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="showDefaultToolsDebugMessages">
                        Show Default Tools Debug Messages
                      </Label>
                    </div>
                    <Switch
                      className="ml-auto"
                      id="showDefaultToolsDebugMessages"
                      name="showDefaultToolsDebugMessages"
                      defaultChecked={
                        chatSettings?.showDefaultToolsDebugMessages
                      }
                    />
                  </div>

                  <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                    <div className="bg-white rounded-xl aspect-square p-3">
                      <Link size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="openExternalLinksInNewTab">
                        Open External Links in New Tab
                      </Label>
                    </div>
                    <Switch
                      className="ml-auto"
                      id="openExternalLinksInNewTab"
                      name="openExternalLinksInNewTab"
                      defaultChecked={chatSettings?.openExternalLinksInNewTab}
                    />
                  </div>

                  <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                    <div className="bg-white rounded-xl aspect-square p-3">
                      <Link size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="openInternalLinksInNewTab">
                        Open Internal Links in New Tab
                      </Label>
                    </div>
                    <Switch
                      className="ml-auto"
                      id="openInternalLinksInNewTab"
                      name="openInternalLinksInNewTab"
                      defaultChecked={chatSettings?.openInternalLinksInNewTab}
                    />
                  </div>

                  <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                    <div className="bg-white rounded-xl aspect-square p-3">
                      <Video size={20} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="openYoutubeVideosInIframe ">
                        Open Youtube Videos in Iframe
                      </Label>
                    </div>
                    <Switch
                      className="ml-auto"
                      id="openYoutubeVideosInIframe"
                      name="openYoutubeVideosInIframe"
                      defaultChecked={chatSettings?.openYoutubeVideosInIframe}
                    />
                  </div>
                </CardContentSection>

                <CardContentSection
                  className={cn({
                    hidden: chatSettingsTab !== "custom_css",
                  })}
                >
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
        </TabsContent>
        <TabsContent value="embed">
          <Card>
            <CardHeader>
              <CardTitle>Embed Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                {!agent.isPublic && (
                  <span className="text-destructive text-sm mb-2 flex items-center">
                    <AlertTriangle className="inline-block mr-2" />
                    Private agents are not embedable. Please make the agent
                    public to embed it.
                  </span>
                )}
                <p className="text-sm text-muted-foreground mb-2">
                  To embed the agent in your website, you can use the following
                  code:
                </p>

                <span className="mb-2 block font-medium text-sm">JS Embed</span>
                <div className="flex flex-row gap-2 mb-4">
                  <code className="text-xs whitespace-pre-wrap break-all bg-zinc-200 p-4 rounded-xl">
                    {`
<!-- Add the container where you want to render the agent. -->
<div id="chat-container"></div>

<!-- Add the script to load the agent. -->
<script src="${appUrl}/embed/chat.bundle.umd.js"></script>

<script>
  // Initialize the chat component
  ChatComponent.renderChatComponent('chat-container', {
    agentId: "${agent.id}",
    apiUrl: "${appUrl}",
    temperature: ${temperature} // Pass temperature to embed options
  });
</script>
                  `}
                  </code>
                </div>
                <span className="mb-2 block font-medium text-sm">
                  iFrame Embed
                </span>
                <div className="flex flex-row gap-2 mb-4">
                  <code className="text-xs whitespace-pre-wrap break-all bg-zinc-200 p-4 rounded-xl">
                    {`
<iframe src="${appUrl}/embed/${agent.id}" width="100%" height="100%"></iframe>
                `}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Embed Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Form method="post">
                <input
                  type="hidden"
                  name="intent"
                  value={Intent.UPDATE_EMBED_SETTINGS}
                />
                <CardContentSection title="">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="maintainConversationSession">
                      Maintain Conversation Session in Embed
                    </Label>
                    <Input
                      type="number"
                      id="maintainConversationSession"
                      name="maintainConversationSession"
                      className="border"
                      defaultValue={
                        chatSettings?.embedSettings?.maintainConversationSession
                      }
                      placeholder="Enter number of minutes"
                    />
                    <p className="text-sm text-muted-foreground">
                      If enabled, the agent will maintain a conversation session
                      in the browser's session storage when the agent is
                      embedded.
                    </p>
                  </div>
                  <div className="flex flex-col space-y-2 mt-4">
                    <Label htmlFor="embedWidgetTitle">Embed Window Title</Label>
                    <Input
                      type="text"
                      id="embedWidgetTitle"
                      name="embedWidgetTitle"
                      className="border"
                      defaultValue={
                        chatSettings?.embedSettings?.embedWidgetTitle
                      }
                      placeholder="Enter embed widget title"
                    />
                    <p className="text-sm text-muted-foreground">
                      This title will be displayed in the chat widget when the
                      agent is embedded in a website.
                    </p>
                  </div>
                </CardContentSection>
                <Button type="submit">Save Changes</Button>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        {canDeleteAgent && (
          <TabsContent value="danger">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Permanently delete the agent and all associated data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form method="post">
                  <input
                    type="hidden"
                    name="intent"
                    value={Intent.DELETE_AGENT}
                  />
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
          </TabsContent>
        )}
      </Tabs>
      <Toaster />
    </div>
  );
};

export default AgentSettings;
