import { Label } from "@radix-ui/react-label";
import React, { useState } from "react";
import { Activity, Book, MessageCircle, User } from "react-feather";
import Markdown from "react-markdown";
import { type LoaderFunctionArgs } from "react-router";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import InventAgentChat, {
  type AgentInventorToolResult,
} from "~/components/inventAgent/inventAgentChat.client";
import Loading from "~/components/loading/loading";
import MarkdownEdit from "~/components/markdownedit/markdownedit.client";
import Steps from "~/components/steps/steps";
import { Badge } from "~/components/ui/badge";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
import type { AgentSettings } from "~/types/agentSetting";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const spaceId = params.spaceId;
  await hasAccessHierarchical(request, "space.create_agent", spaceId);
};

const InventAgent: React.FC = () => {
  const [agentInventorResult, setAgentInventorResult] =
    useState<AgentInventorToolResult | null>(null);
  const [systemPromptKey, setSystemPromptKey] = useState(0);

  const [step, setStep] = React.useState(0);

  const stepItems = [
    {
      title: "Instruct your agent",
      description:
        " We will guide you through the process of creating your agent. Be as specific as possible to get the best results.",
    },
    {
      title: "Choose agent tools",
      description:
        "Select the tools you want to use for your agent. You can choose from the available tools in your space. We have already preselected some tools that are commonly used for agents. You can also add custom tools later.",
    },
    { title: "Activate plugins" },
    { title: "Give agent knowledge" },
    { title: "Review and create agent" },
  ];

  // Default agent settings
  const [agentData, setAgentData] = React.useState<AgentSettings>({
    hasKnowledgeBase: true,
    captureFeedback: true,
    trackingEnabled: true,
  });

  const goToNextStep = () => {
    if (step < stepItems.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      // Final step, handle agent creation logic here
      console.log("Agent data ready for creation:", agentData);
      // You can add your agent creation logic here
    }
  };

  const goToPreviousStep = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  const handleCancel = () => {
    // Handle cancel logic, e.g., navigate back or reset state
    console.log("Agent creation cancelled");
    // You can navigate back or reset the state as needed
  };

  console.log(agentData);

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
          <span className="text-sm text-muted-foreground mb-4 max-w-lg">
            {stepItems[step].description}
          </span>
        </div>
      </div>

      <div className="relative flex flex-col flex-1 shrink-1 overflow-hidden">
        {step === 0 && (
          <div className="relative flex gap-8 flex-1 overflow-hidden">
            <Card className="overflow-auto flex-1/2 p-0">
              <ClientOnlyComponent>
                <InventAgentChat
                  initialPrompt={
                    "I want a wiki. Company Wiki for new employees that join us. Explain policies, no specific tools needed but need to upload documents. Friendly tone. Generate"
                  }
                  onAgentInventorResult={(result) => {
                    setSystemPromptKey((prev) => prev + 1);
                    setAgentInventorResult(result);
                  }}
                />
              </ClientOnlyComponent>
            </Card>

            <Card className="overflow-auto flex-1/2">
              {agentInventorResult && (
                <>
                  <div>
                    <Badge className="mb-4" variant="outline">
                      Agent Inventor Result
                    </Badge>
                  </div>
                  <div className="flex items-start gap-2  border-b pb-4 mb-4">
                    <div className="w-12 h-12 rounded-md bg-blue-200 flex items-center justify-center mb-2 shrink-0">
                      <User size={20} className="text-primary" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h2 className="font-medium text-xl">
                        {agentInventorResult.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {agentInventorResult.description}
                      </p>
                    </div>
                  </div>
                  <Badge className="mb-4" variant="outline">
                    Generated Instructions
                  </Badge>
                  <ClientOnlyComponent>
                    <Markdown
                      className="prose prose-sm"
                      children={agentInventorResult.systemPrompt}
                    />
                  </ClientOnlyComponent>
                </>
              )}

              {!agentInventorResult && (
                <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
                  <Loading />
                </div>
              )}
            </Card>
          </div>
        )}
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
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
      </div>

      <div className="h-18 border-t mt-8 flex items-center shrink-0">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            className="ml-auto"
            variant="outline"
            onClick={goToPreviousStep}
          >
            Go Back
          </Button>

          <Button className="ml-auto" variant="default" onClick={goToNextStep}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InventAgent;
