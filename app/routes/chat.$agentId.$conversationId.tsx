import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import Chat from "~/components/chat/chat.client";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import { prisma } from "@db/db.server";
import type { Message } from "ai";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { PERMISSIONS } from "~/types/auth";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const user = await hasAccess(request, PERMISSIONS.VIEW_AGENT, agentId);
  const { conversationId } = params;
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId, agentId },
    include: {
      messages: true,
    },
  });
  if (!conversation) {
    throw new Response("Not Found", { status: 404 });
  }
  if (conversation.userId !== user.id) {
    throw new Response("Unauthorized", { status: 403 });
  }
  const initialMessages: Message[] = conversation.messages.map((message) => ({
    id: message.id,
    role: message.author === "USER" ? "user" : "assistant",
    content: message.author !== "TOOL" ? message.content : "",
    toolInvocations:
      message.author === "TOOL" ? [JSON.parse(message.content)] : undefined,
  }));
  return {
    conversation,
    initialMessages,
    conversationId,
    agentId: agentId as string,
  };
};

export default function Index() {
  const { initialMessages, conversationId, agentId } =
    useLoaderData<typeof loader>();
  return (
    <ClientOnlyComponent>
      {Chat && (
        <Chat
          initialConversationId={conversationId}
          initialMessages={initialMessages}
          agentId={agentId}
        />
      )}
    </ClientOnlyComponent>
  );
}
