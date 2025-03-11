import { useLoaderData, useParams, useRevalidator } from "react-router";
import Chat from "~/components/chat/chat.client";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { getChatSettings } from "~/lib/llm/chat.server";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";

export const loader = async ({ params }: { params: { agentId: string } }) => {
  const toolNames = toolNameIdentifierList();
  const chatSettings = await getChatSettings(params.agentId);
  return { toolNames, chatSettings };
};

export default function Index() {
  const { revalidate } = useRevalidator();
  const { agentId } = useParams();
  const { toolNames, chatSettings } = useLoaderData<typeof loader>();
  const onConversationStart = (conversationId: string) => {
    revalidate();
    window.history.replaceState(null, "", `/chat/${agentId}/${conversationId}`);
  };
  return (
    <ClientOnlyComponent>
      {Chat && (
        <Chat
          onConversationStart={onConversationStart}
          agentId={agentId as string}
          toolNamesList={toolNames}
          agentChatSettings={chatSettings}
        />
      )}
    </ClientOnlyComponent>
  );
}
