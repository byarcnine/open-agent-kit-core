import {
  type LoaderFunctionArgs,
  useLoaderData,
  useParams,
} from "react-router";
import Chat from "~/components/chat/chat.client";
import { prisma } from "@db/db.server";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";
import type { ChatSettings } from "~/types/chat";
import { urlAllowedForAgent } from "~/routes/utils";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { agentId } = params;
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId as string,
    },
  });
  if (!agent) {
    throw new Response("Agent not found", { status: 404 });
  }
  if (!agent.isPublic) {
    throw new Response("Agent is not public", { status: 403 });
  }

  const isAllowed = await urlAllowedForAgent(request.headers.get("Origin") as string, agentId as string);
  if (!isAllowed) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const toolNames = toolNameIdentifierList();
  const chatSettings = JSON.parse(agent.chatSettings as string) as ChatSettings;
  return { agent, toolNames, chatSettings };
};

const ChatEmbed = () => {
  const { agentId } = useParams();
  const { chatSettings, toolNames } = useLoaderData();
  return (
    <div className="h-screen w-full">
      <ClientOnlyComponent>
        {Chat && (
          <Chat
            agentId={agentId as string}
            agentChatSettings={chatSettings}
            toolNamesList={toolNames}
          />
        )}
      </ClientOnlyComponent>
    </div>
  );
};

export default ChatEmbed;
