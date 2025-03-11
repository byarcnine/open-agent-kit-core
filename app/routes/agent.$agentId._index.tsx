import Chat from "~/components/chat/chat.client";
import { useLoaderData, useParams, type LoaderFunction } from "react-router";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";
import { getChatSettings } from "~/lib/llm/chat.server";

// Loader function to fetch environment variable
export const loader: LoaderFunction = async ({ params }) => {
  // fetch agent

  const settings = await getChatSettings(params.agentId as string);
  const toolNames = toolNameIdentifierList();
  return {
    chatSettings: settings,
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
