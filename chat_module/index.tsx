import Chat from "../app/components/chat/chat.client";

export type ChatComponentType = {
  apiUrl?: string;
  meta?: object;
  agentId: string;
};

/**
 * ChatComponent is a standalone chat component that can be used in any React project.
 * It is a wrapper around the Chat component from the app/components/chat/chat.client.tsx file.
 *
 * @param apiUrl - The URL of the API to use for the chat.
 * @param agentId - The ID of the agent to use for the chat.
 * @param meta - The meta object to pass to the chat. The meta object can be accessed by the tools.
 */
function ChatComponent({ apiUrl, agentId, meta }: ChatComponentType) {
  return <Chat apiUrl={apiUrl} agentId={agentId} isEmbed meta={meta} />;
}

export default ChatComponent;
