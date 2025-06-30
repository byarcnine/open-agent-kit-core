import { Label } from "@radix-ui/react-label";
import React, { useState } from "react";
import { prisma } from "@db/db.server";
import { Activity, Book, MessageCircle, User } from "react-feather";
import {
  redirect,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { z } from "zod";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import InventAgentChat, {
  type AgentInventorToolResult,
} from "~/components/inventAgent/inventAgentChat.client";
import Loading from "~/components/loading/loading";
import Steps from "~/components/steps/steps";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { AgentSettings } from "~/types/agentSetting";
import MarkdownViewer from "~/components/chat/markdownViewer";
import "~/components/chat/markdown.scss";
import type { PluginType } from "~/types/plugins";
import { cn } from "~/lib/utils";
import Warning from "~/components/ui/warning";

const CreateAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  slug: z
    .string()
    .min(3, "Agent slug is required and must be at least 3 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens",
    ),
  description: z.string(),
  plugins: z.array(z.string()).default([]),
  hasKnowledgeBase: z.boolean().default(true),
  captureFeedback: z.boolean().default(true),
  trackingEnabled: z.boolean().default(true),
  systemPrompt: z.string(),
  needsDocumentUpload: z.boolean().default(false),
});

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { spaceId } = params;
  await hasAccessHierarchical(request, "space.create_agent", spaceId);
  return {
    spaceId,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { spaceId } = params;
  await hasAccessHierarchical(
    request,
    PERMISSION["space.create_agent"],
    spaceId,
  );
  const formData = await request.formData();

  const validation = CreateAgentSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    plugins: formData.getAll("plugins"),
    hasKnowledgeBase: formData.get("hasKnowledgeBase") === "true",
    captureFeedback: formData.get("captureFeedback") === "true",
    trackingEnabled: formData.get("trackingEnabled") === "true",
    systemPrompt: formData.get("systemPrompt"),
    needsDocumentUpload: formData.get("needsDocumentUpload") === "true",
  });
  if (!validation.success) {
    return {
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const {
    name,
    slug,
    description,
    plugins,
    hasKnowledgeBase,
    captureFeedback,
    trackingEnabled,
    systemPrompt,
    needsDocumentUpload,
  } = validation.data;

  try {
    const agent = await prisma.agent.create({
      data: {
        id: slug,
        name,
        description,
        pluginAvailability: {
          create: plugins.map((plugin) => ({
            isEnabled: true,
            isGlobal: false,
            pluginIdentifier: plugin,
          })),
        },
        space: {
          connect: {
            id: spaceId,
          },
        },
        agentSettings: JSON.stringify({
          hasKnowledgeBase,
          captureFeedback,
          trackingEnabled,
        } satisfies AgentSettings),
        systemPrompts: {
          create: {
            prompt: systemPrompt,
            key: "default",
          },
        },
      },
    });
    if (needsDocumentUpload) {
      return redirect(`/space/${spaceId}/agent/${agent.id}/knowledge`);
    }
    return redirect(`/space/${spaceId}/agent/${agent.id}`);
  } catch (error) {
    console.error(error);
    return {
      errors: {
        slug: ["Space with this slug already exists"],
      },
    };
  }
};

enum StepTypes {
  INSTRUCT_AGENT = 0,
  CHOOSE_TOOLS = 1,
  ACTIVATE_PLUGINS = 2,
  REVIEW_CREATE = 3,
}

const InventAgent: React.FC = () => {
  const [agentInventorResult, setAgentInventorResult] =
    useState<AgentInventorToolResult | null>(null);

  const { spaceId } = useLoaderData<{ spaceId: string }>();

  const [step, setStep] = React.useState(StepTypes.INSTRUCT_AGENT);
  const [inventorRunning, setInventorRunning] = useState(false);
  const [searchParams] = useSearchParams();
  const starterPrompt = searchParams.get("prompt");

  const navigate = useNavigate();

  const fetch = useFetcher();
  const stepItems = [
    {
      title: "Invent your Agent",
      description:
        "We will guide you through the process of creating your agent. Be as specific as possible to get the best results.",
    },
    {
      title: "Choose Agent Tools",
      description:
        "Select the tools you want to use for your agent. You can choose from the available tools in your space. We have already preselected some tools that are commonly used for agents. You can also add custom tools later.",
    },
    {
      title: "Activate Plugins",
      description: "Activate the plugins you want to use with your agent.",
    },
    {
      title: "Review & Create",
      description: "Review your agent settings and create your agent.",
    },
  ];

  // Default agent settings
  const [agentData, setAgentData] = React.useState<
    {
      plugins: PluginType[];
      systemPrompt: string;
      name: string;
      description: string;
      needsDocumentUpload: boolean;
    } & AgentSettings
  >({
    hasKnowledgeBase: true,
    captureFeedback: true,
    trackingEnabled: true,
    plugins: [],
    systemPrompt: "",
    name: "",
    description: "",
    needsDocumentUpload: false,
  });

  const goToNextStep = () => {
    if (step < stepItems.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      // Final step, handle agent creation logic here
      console.log("Agent data ready for creation:", agentData);
      if (!agentInventorResult) return;
      fetch.submit(
        {
          name: agentData.name,
          slug: agentInventorResult?.slug,
          description: agentData.description,
          plugins: agentData.plugins.map((p) => p.name),
          hasKnowledgeBase: agentData.hasKnowledgeBase,
          captureFeedback: agentData.captureFeedback,
          trackingEnabled: agentData.trackingEnabled,
          systemPrompt: agentData.systemPrompt,
          needsDocumentUpload: agentData.needsDocumentUpload,
        },
        {
          method: "post",
        },
      );
    }
  };

  const goToPreviousStep = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (
      !confirm("Are you sure you want to cancel? All progress will be lost.")
    ) {
      e.preventDefault();
      return;
    }
  };

  const handleAgentInventorResult = (result: AgentInventorToolResult) => {
    setAgentInventorResult(result);
    setAgentData((prev) => ({
      ...prev,
      ...result,
      name: result.name,
      systemPrompt: result.systemPrompt,
      description: result.description,
      plugins: result.plugins.filter((p) =>
        result.recommendedActivePlugins.includes(p.name),
      ),
    }));
  };

  return (
    <div className="w-full flex flex-col h-full overflow-hidden pt-8 px-4 md:px-8">
      <div className="sticky top-0 shrink-0">
        <div className="flex flex-col pb-8 gap-4">
          <h1 className="text-3xl font-medium">Agent Invention Center</h1>
        </div>
        <Steps step={stepItems} currentStep={step} />
        <div className="pt-4 mb-8 flex flex-col gap-2">
          <h2 className="font-medium text-2xl">
            {step + 1}. {stepItems[step].title}
          </h2>
          <span className="text-sm text-muted-foreground mb-4 max-w-3xl">
            {stepItems[step].description}
          </span>
        </div>
      </div>

      <div className="relative flex flex-col flex-1 shrink-1 overflow-hidden">
        <div
          className={cn("relative flex gap-8 flex-1 overflow-hidden", {
            hidden: step !== StepTypes.INSTRUCT_AGENT,
          })}
        >
          <Card className="overflow-auto flex-1/2 p-0">
            <ClientOnlyComponent>
              <InventAgentChat
                initialPrompt={starterPrompt as string}
                onAgentInventorResult={handleAgentInventorResult}
                onInventorRunning={setInventorRunning}
              />
            </ClientOnlyComponent>
          </Card>

          <Card className="overflow-auto flex-1/2">
            {agentInventorResult && (
              <>
                <h3 className="mb-4 text-2xl font-medium">
                  Review Agent Information
                </h3>
                <Warning
                  className="mb-8 max-w-3xl"
                  description="This is a preview of your agent. You can update the name, description, and all other settings later. Carefully review the purpose and refine by providing your feedback on the left side."
                />

                <div className="flex items-start gap-2 mb-4">
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="flex flex-col">
                      <Label
                        htmlFor="agentName"
                        className="text-muted-foreground text-sm"
                      >
                        Agent Name
                      </Label>
                      <span className="text-lg mb-2">{agentData.name}</span>
                    </div>
                    <div className="flex flex-col">
                      <Label
                        htmlFor="agentDescription"
                        className="text-muted-foreground text-sm"
                      >
                        Agent Description
                      </Label>
                      <span className="text-sm max-w-xl">
                        {agentData.description}
                      </span>
                    </div>
                  </div>
                </div>
                {!inventorRunning && (
                  <>
                    <Label
                      htmlFor="agentDescription"
                      className="text-muted-foreground text-sm"
                    >
                      Instructions
                    </Label>
                    <ClientOnlyComponent>
                      <div className="text-sm max-w-3xl oak-chat__message-content oak-chat__message-content--inventor">
                        <MarkdownViewer text={agentData.systemPrompt} />
                      </div>
                    </ClientOnlyComponent>
                  </>
                )}
              </>
            )}

            {
              <div className="pointer-events-none absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                {inventorRunning ? (
                  <Loading />
                ) : agentData.systemPrompt ? undefined : (
                  <span>Waiting on your instructions ...</span>
                )}
              </div>
            }
          </Card>
        </div>

        {step === StepTypes.CHOOSE_TOOLS && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                <div className="bg-white rounded-xl aspect-square p-3">
                  <Book size={20} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="hasKnowledgeBase">Knowledge Base</Label>
                  <p className="text-sm text-muted-foreground">
                    If enabled the agent can access the knowledge base to answer
                    questions. This is useful for agents that need to provide
                    information from a specific domain or context.
                  </p>
                </div>
                <Switch
                  className="ml-auto"
                  id="hasKnowledgeBase"
                  name="hasKnowledgeBase"
                  defaultChecked={agentData.hasKnowledgeBase}
                  onCheckedChange={(checked) => {
                    setAgentData((prev) => ({
                      ...prev,
                      hasKnowledgeBase: checked,
                    }));
                  }}
                />
              </div>
              <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                <div className="bg-white rounded-xl aspect-square p-3">
                  <MessageCircle size={20} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="captureFeedback">Capture Feedback</Label>
                  <p className="text-sm text-muted-foreground">
                    If enabled the agent will capture feedback from users and
                    store it in the database. This is useful for improving the
                    agent's performance and understanding user needs.
                  </p>
                </div>
                <Switch
                  className="ml-auto"
                  id="captureFeedback"
                  name="captureFeedback"
                  defaultChecked={agentData.captureFeedback}
                  onCheckedChange={(checked) => {
                    setAgentData((prev) => ({
                      ...prev,
                      captureFeedback: checked,
                    }));
                  }}
                />
              </div>
              <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
                <div className="bg-white rounded-xl aspect-square p-3">
                  <Activity size={20} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="trackingEnabled">Conversation Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    If enabled the agent will track conversations and store them
                    in the database. This is useful for analyzing user
                    interactions and improving the agent's performance.
                  </p>
                </div>
                <Switch
                  className="ml-auto"
                  id="trackingEnabled"
                  name="trackingEnabled"
                  defaultChecked={agentData.trackingEnabled}
                  onCheckedChange={(checked) => {
                    setAgentData((prev) => ({
                      ...prev,
                      trackingEnabled: checked,
                    }));
                  }}
                />
              </div>
            </div>
          </>
        )}
        {step === StepTypes.ACTIVATE_PLUGINS && (
          <div className="w-full flex flex-col overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              {agentInventorResult?.plugins.map((plugin) => (
                <Card key={plugin.name} className="flex flex-col">
                  <CardHeader className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {plugin.displayName}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs px-2 py-1">
                          Built-in
                        </Badge>
                      </div>
                    </div>
                    {plugin.description && (
                      <div className="text-sm text-muted-foreground mb-4">
                        {plugin.description}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Switch
                      checked={agentData.plugins.some(
                        (p) => p.name === plugin.name,
                      )}
                      onCheckedChange={(checked) => {
                        setAgentData((prev) => ({
                          ...prev,
                          plugins: checked
                            ? [...prev.plugins, plugin]
                            : prev.plugins.filter((p) => p !== plugin),
                        }));
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        {step === StepTypes.REVIEW_CREATE && (
          <div className="w-full flex flex-col overflow-auto">
            <h3 className="text-2xl font-medium mb-4">
              General Agent Information
            </h3>
            <Card className="mb-8">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-md bg-blue-200 flex items-center justify-center mb-2 shrink-0">
                  <User size={20} className="text-primary" />
                </div>
                {agentInventorResult && (
                  <div className="flex flex-col gap-2">
                    <h2 className="font-medium text-xl">
                      {agentInventorResult.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {agentInventorResult.description}
                    </p>
                  </div>
                )}
              </div>
            </Card>
            <h3 className="text-2xl font-medium mb-4">Instructions</h3>
            <Card className="mb-8">
              <div className="oak-chat__message-content oak-chat__message-content--assistant">
                <MarkdownViewer
                  text={
                    agentInventorResult
                      ? agentInventorResult.systemPrompt
                      : "No instructions provided yet."
                  }
                />
              </div>
            </Card>
            <h3 className="text-2xl font-medium mb-4">
              Activated Tools and Settings
            </h3>
            <Card className="mb-8 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={agentData.hasKnowledgeBase}
                  onCheckedChange={(checked) => {
                    setAgentData((prev) => ({
                      ...prev,
                      hasKnowledgeBase: checked,
                    }));
                  }}
                />
                <span>Knowledge Base</span>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={agentData.captureFeedback}
                  onCheckedChange={(checked) => {
                    setAgentData((prev) => ({
                      ...prev,
                      captureFeedback: checked,
                    }));
                  }}
                />
                <span>Capture Feedback</span>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={agentData.trackingEnabled}
                  onCheckedChange={(checked) => {
                    setAgentData((prev) => ({
                      ...prev,
                      trackingEnabled: checked,
                    }));
                  }}
                />
                <span>Conversation Tracking</span>
              </div>
            </Card>
            {agentData.plugins.length > 0 && (
              <>
                <h3 className="text-2xl font-medium mb-4">Activated Plugins</h3>
                <div className="flex flex-col gap-2">
                  {agentData.plugins.map((plugin) => (
                    <Card key={plugin.name} className="flex flex-col">
                      <CardHeader className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">
                              {plugin.displayName}
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-1"
                            >
                              Built-in
                            </Badge>
                          </div>
                        </div>
                        {plugin.description && (
                          <div className="text-sm text-muted-foreground mb-4">
                            {plugin.description}
                          </div>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="h-18 border-t mt-8 flex items-center shrink-0">
        <form
          method="post"
          className="flex items-center gap-2 w-full"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/space/${spaceId}`);
          }}
        >
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </form>
        <div className="flex items-center gap-2 ml-auto">
          {step !== StepTypes.INSTRUCT_AGENT && (
            <Button
              className="ml-auto"
              variant="outline"
              onClick={goToPreviousStep}
            >
              Go Back
            </Button>
          )}
          <Button className="ml-auto" variant="default" onClick={goToNextStep}>
            {step === StepTypes.REVIEW_CREATE ? "Create Agent" : "Next Step"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InventAgent;
