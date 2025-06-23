import Chat from "~/components/chat/chat.client";
import { useLoaderData, useParams, type LoaderFunction } from "react-router";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";
import { getChatSettings } from "~/lib/llm/chat.server";

// Loader function to fetch environment variable
export const loader: LoaderFunction = async ({ params }) => {
  const settingsPromise = getChatSettings(params.agentId as string);
  const toolNamesPromise = toolNameIdentifierList();
  const [settings, toolNames] = await Promise.all([
    settingsPromise,
    toolNamesPromise,
  ]);
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
