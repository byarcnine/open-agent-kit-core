import { useParams, useRevalidator } from "react-router";
import Chat from "~/components/chat/chat.client";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";

export default function Index() {
  const { revalidate } = useRevalidator();
  const { agentId } = useParams();
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
        />
      )}
    </ClientOnlyComponent>
  );
}
