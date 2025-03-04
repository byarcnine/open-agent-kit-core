import Chat from "~/components/chat/chat.client";
import { useLoaderData, useParams, type LoaderFunction } from "react-router";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { prisma } from "@db/db.server";
import type { ChatSettings } from "~/types/chat";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";

// Loader function to fetch environment variable
export const loader: LoaderFunction = async ({ params }) => {
  // fetch agent

  const agent = await prisma.agent.findUnique({
    where: {
      id: params.agentId as string,
    },
  });
  if (!agent) {
    throw new Response("Agent not found", { status: 404 });
  }
  const toolNames = toolNameIdentifierList();
  return {
    chatSettings: JSON.parse(agent.chatSettings as string) as ChatSettings,
    toolNames,
  };
};

export default function Index() {
  const { agentId } = useParams();
  const data = useLoaderData();

  return (
    <ClientOnlyComponent>
      {Chat && (
        <Chat
          agentId={agentId as string}
          agentChatSettings={data.chatSettings}
          toolNamesList={data.toolNames}
        />
      )}
    </ClientOnlyComponent>
  );
}
