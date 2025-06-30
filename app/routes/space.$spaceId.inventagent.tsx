import { Label } from "@radix-ui/react-label";
import React, { useState } from "react";
import { prisma } from "@db/db.server";
import { Activity, Book, MessageCircle } from "react-feather";
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
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { AgentSettings } from "~/types/agentSetting";
import MarkdownViewer from "~/components/chat/markdownViewer";
import "~/components/chat/markdown.scss";
import type { PluginType } from "~/types/plugins";
import { cn } from "~/lib/utils";
import Warning from "~/components/ui/warning";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import ToggleWithLabel from "~/components/toggleWithLabel/toggleWithLabel";
import MarkdownEdit from "~/components/markdownedit/markdownedit.client";
import AgentAssemblyAnimation from "~/components/agentAssemblyAnimation/agentAssemblyAnimation";

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
  } = validation.data;

  try {
    await prisma.agent.create({
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
  CREATE = 4,
}

const InventAgent: React.FC = () => {
  const { spaceId } = useLoaderData<{ spaceId: string }>();

  const [agentInventorResult, setAgentInventorResult] =
    useState<AgentInventorToolResult | null>(null);
  const [step, setStep] = React.useState(StepTypes.INSTRUCT_AGENT);
  const [inventorRunning, setInventorRunning] = useState(false);

  const [searchParams] = useSearchParams();
  const starterPrompt = searchParams.get("prompt");

  const navigate = useNavigate();
  const fetch = useFetcher();

  // All Steps
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
      description:
        "Review your agent settings and create your agent. You can update the name, description, and all other settings later after creation.",
    },
  ];

  // Available Tools
  const availableTools = [
    {
      id: "hasKnowledgeBase",
      name: "Knowledge Base",
      description:
        "Access a knowledge base to answer questions and provide information.",
      icon: <Book size={20} />,
    },
    {
      id: "captureFeedback",
      name: "Feedback Capture",
      description:
        "Capture user feedback and store it in the database for future analysis.",
      icon: <MessageCircle size={20} />,
    },
    {
      id: "trackingEnabled",
      name: "Conversation Tracking",
      description:
        "Track conversations and store them in the database for later review.",
      icon: <Activity size={20} />,
    },
  ];

  const [agentData, setAgentData] = React.useState<
    {
      plugins: PluginType[];
      systemPrompt: string;
      name: string;
      description: string;
      slug: string;
      needsDocumentUpload: boolean;
    } & AgentSettings
  >({
    hasKnowledgeBase: false,
    captureFeedback: false,
    trackingEnabled: false,
    plugins: [],
    systemPrompt: "",
    name: "",
    slug: "",
    description: "",
    needsDocumentUpload: false,
  });

  const goToNextStep = async () => {
    if (step < stepItems.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      if (!agentInventorResult) return;
      await fetch.submit(
        {
          name: agentData.name,
          slug: agentData.slug,
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
      setStep(StepTypes.CREATE);
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

  const handleAnimationComplete = () => {
    if (agentData.needsDocumentUpload) {
      navigate(`/space/${spaceId}/agent/${agentData.slug}/knowledge`);
    }
    navigate(`/space/${spaceId}/agent/${agentData.slug}`);
  };

  const handleAgentInventorResult = (result: AgentInventorToolResult) => {
    setAgentInventorResult(result);
    setAgentData((prev) => ({
      ...prev,
      ...result,
      name: result.name,
      systemPrompt: result.systemPrompt,
      description: result.description,
      hasKnowledgeBase: result.needsKnowledgeBase,
      captureFeedback: result.shouldCaptureFeedback,
      trackingEnabled: result.shouldTrackConversation,
      plugins: result.plugins.filter((p) =>
        result.recommendedActivePlugins.includes(p.name),
      ),
    }));
  };

  return (
    <div className="w-full flex flex-col h-full overflow-hidden pt-8 px-4 md:px-8">
      {step !== StepTypes.CREATE && (
        <>
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
        </>
      )}

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
            <div className="grid grid-cols-2 gap-4 max-w-5xl">
              {availableTools.map((tool) => (
                <ToggleWithLabel
                  key={tool.id}
                  icon={tool.icon}
                  title={tool.name}
                  description={tool.description}
                  isChecked={agentData[tool.id as keyof AgentSettings] ?? false}
                  onToggle={(checked) => {
                    setAgentData((prev) => ({
                      ...prev,
                      [tool.id]: checked,
                    }));
                  }}
                />
              ))}
            </div>
          </>
        )}
        {step === StepTypes.ACTIVATE_PLUGINS && (
          <div className="grid grid-cols-2 gap-4 max-w-5xl">
            {agentInventorResult?.plugins.map((plugin) => (
              <ToggleWithLabel
                key={plugin.name}
                title={plugin.displayName}
                description={plugin.description}
                isChecked={agentData.plugins.some(
                  (p) => p.name === plugin.name,
                )}
                onToggle={(checked) => {
                  setAgentData((prev) => ({
                    ...prev,
                    plugins: checked
                      ? [...prev.plugins, plugin]
                      : prev.plugins.filter((p) => p.name !== plugin.name),
                  }));
                }}
              />
            ))}
          </div>
        )}
        {step === StepTypes.REVIEW_CREATE && (
          <div className="w-full flex flex-col overflow-auto">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              <Card className="mb-8 ">
                <div className="flex flex-col gap-2 w-full">
                  <h3 className="font-medium text-xl">Agent Information</h3>
                  <div>
                    <Label
                      htmlFor="agentName"
                      className="text-muted-foreground text-sm"
                    >
                      Name
                    </Label>
                    <Input
                      id="agentName"
                      name="agentName"
                      value={agentData.name}
                      onChange={(e) => {
                        setAgentData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }));
                      }}
                      placeholder="Enter a unique name for your agent."
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="agentDescription"
                      className="text-muted-foreground text-sm"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="agentDescription"
                      name="agentDescription"
                      value={agentData.description}
                      onChange={(e) => {
                        setAgentData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }));
                      }}
                      placeholder="Optional agent description"
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="agentSlug"
                      className="text-muted-foreground text-sm"
                    >
                      Slug
                    </Label>
                    <Input
                      id="agentSlug"
                      name="agentSlug"
                      value={agentData.slug}
                      onChange={(e) => {
                        setAgentData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }));
                      }}
                      placeholder="Enter a unique name for your agent."
                    />
                  </div>
                </div>
              </Card>
              <Card className="mb-8 flex flex-col gap-4">
                <h3 className="text-xl font-medium">Agent Tools</h3>
                {availableTools.map((tool) => (
                  <ToggleWithLabel
                    key={tool.id}
                    icon={tool.icon}
                    title={tool.name}
                    description={tool.description}
                    isChecked={
                      agentData[tool.id as keyof AgentSettings] ?? false
                    }
                    onToggle={(checked) => {
                      setAgentData((prev) => ({
                        ...prev,
                        [tool.id]: checked,
                      }));
                    }}
                  />
                ))}
              </Card>

              <Card className="mb-8">
                <h3 className="text-2xl font-medium mb-4">Activated Plugins</h3>
                <div className="flex flex-col gap-2">
                  {agentData.plugins.map((plugin) => (
                    <ToggleWithLabel
                      key={plugin.name}
                      title={plugin.displayName}
                      description={plugin.description}
                      isChecked={agentData.plugins.some(
                        (p) => p.name === plugin.name,
                      )}
                      onToggle={(checked) => {
                        setAgentData((prev) => ({
                          ...prev,
                          plugins: checked
                            ? [...prev.plugins, plugin]
                            : prev.plugins.filter(
                                (p) => p.name !== plugin.name,
                              ),
                        }));
                      }}
                    />
                  ))}
                  {agentData.plugins.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No plugins activated. Go back to the previous step to
                      activate plugins. You an also add plugins later.
                    </span>
                  )}
                </div>
              </Card>
              <Card className="col-span-2">
                <h3 className="text-2xl font-medium mb-4">System Prompt</h3>
                <div className="oak-chat__message-content oak-chat__message-content--inventor">
                  <ClientOnlyComponent>
                    {MarkdownEdit && (
                      <MarkdownEdit
                        prompt={
                          agentInventorResult
                            ? agentInventorResult.systemPrompt
                            : "No instructions provided yet."
                        }
                        onChange={(value) => {
                          setAgentData((prev) => ({
                            ...prev,
                            systemPrompt: value,
                          }));
                        }}
                      />
                    )}
                  </ClientOnlyComponent>
                </div>
              </Card>
            </div>
          </div>
        )}
        {step === StepTypes.CREATE && (
          <AgentAssemblyAnimation onComplete={handleAnimationComplete} />
        )}
      </div>

      {step !== StepTypes.CREATE && (
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
            <Button
              className="ml-auto"
              variant="default"
              disabled={inventorRunning || !agentInventorResult}
              onClick={goToNextStep}
            >
              {step === StepTypes.REVIEW_CREATE ? "Create Agent" : "Next Step"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventAgent;
