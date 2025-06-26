import { Label } from "@radix-ui/react-label";
import React from "react";
import { Activity, Book, ChevronRight, MessageCircle } from "react-feather";
import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import InventAgentChat from "~/components/inventAgent/inventAgentChat.client";

import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import Warning from "~/components/ui/warning";
import {
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { AgentSettings } from "~/types/agentSetting";
import type { SessionUser } from "~/types/auth";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.super_admin"],
  );

  const userScopes = await getUserScopes(user);

  return {
    user: user as SessionUser,
    userScopes,
  };
};

const InventAgent: React.FC = () => {
  const { user, userScopes } = useLoaderData<typeof loader>();

  const [showToolSelection, setShowToolSelection] = React.useState(false);

  const [agentData, setAgentData] = React.useState<AgentSettings>({
    hasKnowledgeBase: true,
    captureFeedback: true,
    trackingEnabled: true,
  });

  const handleToolSection = () => {
    setShowToolSelection(true);
  };

  console.log(agentData);

  return (
    <div className="w-full flex flex-col h-full overflow-hidden pt-8 px-4 md:px-8">
      <div className="sticky top-0 shrink-0">
        <div className="flex flex-col pb-4 gap-4">
          <h1 className="text-3xl font-medium">Agent Invention Center</h1>
          <div className="max-w-2xl">
            <Warning
              description="The agent invention center is a new feature that allows you to create agents by simply describing what you need. It is still in development and may not work as expected."
              className="mb-4"
            />
          </div>
        </div>
      </div>
      {!showToolSelection && (
        <div className="relative flex flex-col flex-1 shrink-1 overflow-hidden">
          <div className="flex gap-8">
            <div className="flex justify-between flex-1/2">
              <div className="flex flex-col gap-2">
                <h3 className="font-medium text-xl">
                  Refine your agent description
                </h3>
                <span className="text-sm text-muted-foreground mb-4 max-w-md">
                  Describe the agent you want to create. The more details you
                  provide, the better the generated instructions will be.
                </span>
              </div>
              <div className="flex items-center justify-end">
                <ChevronRight size={24} />
                <ChevronRight size={24} />
                <ChevronRight size={24} />
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-1/2">
              <h3 className="font-medium text-xl">Review Instructions</h3>
              <span className="text-sm text-muted-foreground mb-4 max-w-md">
                The following instruction has been generated based on your
                input. Carefully review it and make any necessary adjustments
                before continuing.
              </span>
            </div>
          </div>

          <div className="relative flex gap-8 flex-1 overflow-hidden">
            <Card className="overflow-auto flex-1/2 p-0">
              <ClientOnlyComponent>
                <InventAgentChat />
              </ClientOnlyComponent>
            </Card>

            <Card className="overflow-auto flex-1/2">
              <span>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem
                accusantium doloremque laudantium, totam rem aperiam, eaque ipsa
                quae ab illo inventore veritatis et quasi architecto beatae
                vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia
                voluptas sit aspernatur aut odit aut fugit, sed quia
                consequuntur magni dolores eos qui ratione voluptatem sequi
                nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor
                sit amet, consectetur, adipisci velit, sed quia non numquam eius
                modi tempora incidunt ut labore et dolore magnam aliquam quaerat
                voluptatem. Ut enim ad minima veniam, quis nostrum
                exercitationem ullam corporis suscipit laboriosam, nisi ut
                aliquid ex ea commodi consequatur? Quis autem vel eum iure
                reprehenderit qui in ea voluptate velit esse quam nihil
                molestiae consequatur, vel illum qui dolorem eum fugiat quo
                voluptas nulla pariatur? Sed ut perspiciatis unde omnis iste
                natus error sit voluptatem accusantium doloremque laudantium,
                totam rem aperiam, eaque ipsa quae ab illo inventore veritatis
                et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim
                ipsam voluptatem quia voluptas sit aspernatur aut odit aut
                fugit, sed quia consequuntur magni dolores eos qui ratione
                voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem
                ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia
                non numquam eius modi tempora incidunt ut labore et dolore
                magnam aliquam quaerat voluptatem. Ut enim ad minima veniam,
                quis nostrum exercitationem ullam corporis suscipit laboriosam,
                nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum
                iure reprehenderit qui in ea voluptate velit esse quam nihil
                molestiae consequatur, vel illum qui dolorem eum fugiat quo
                voluptas nulla pariatur?Sed ut perspiciatis unde omnis iste
                natus error sit voluptatem accusantium doloremque laudantium,
                totam rem aperiam, eaque ipsa quae ab illo inventore veritatis
                et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim
                ipsam voluptatem quia voluptas sit aspernatur aut odit aut
                fugit, sed quia consequuntur magni dolores eos qui ratione
                voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem
                ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia
                non numquam eius modi tempora incidunt ut labore et dolore
                magnam aliquam quaerat voluptatem. Ut enim ad minima veniam,
                quis nostrum exercitationem ullam corporis suscipit laboriosam,
                nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum
                iure reprehenderit qui in ea voluptate velit esse quam nihil
                molestiae consequatur, vel illum qui dolorem eum fugiat quo
                voluptas nulla pariatur?
              </span>
            </Card>
          </div>
        </div>
      )}
      {showToolSelection && (
        <div className="flex-1">
          <div className="flex flex-col gap-2">
            <h3 className="font-medium text-xl">Choose Agent Tools</h3>
            <span className="text-sm text-muted-foreground mb-4 max-w-2xl">
              Select the tools you want to use for your agent. You can choose
              from the available tools in your space. We have already
              preselected some tools that are commonly used for agents. You can
              also add custom tools later.
            </span>
          </div>
          <div className="flex flex-col gap-2">
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
        </div>
      )}
      <div className="h-18 bg-blue-100 mt-8 rounded-t-2xl flex items-center px-4 md:px-8 shrink-0">
        <span className="text-sm font-medium">
          {!showToolSelection &&
            "Carefully read the generated instruction above. If it meets your requirements, you can proceed to create the agent."}
          {showToolSelection &&
            "Select the tools you want to use for your agent. When you are done, click the 'Invent' button to continue."}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {showToolSelection && (
            <Button
              className="ml-auto"
              variant="outline"
              onClick={() => setShowToolSelection(false)}
            >
              Go Back
            </Button>
          )}
          <Button
            className="ml-auto"
            variant="default"
            onClick={handleToolSection}
          >
            {!showToolSelection ? "Next Step" : "Invent Agent"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InventAgent;
