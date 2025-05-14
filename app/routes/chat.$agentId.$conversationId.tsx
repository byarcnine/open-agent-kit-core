import { Await, useLoaderData, type LoaderFunctionArgs } from "react-router";
import Chat from "~/components/chat/chat.client";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import { prisma } from "@db/db.server";
import type { Message } from "ai";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { PERMISSIONS } from "~/types/auth";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";
import { getChatSettings } from "~/lib/llm/chat.server";
import { Suspense } from "react";
import { Loader } from "react-feather";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  await hasAccess(request, PERMISSIONS.VIEW_AGENT, agentId);
  const { conversationId } = params;
  const initialMessagesPromise = prisma.conversation
    .findUnique({
      where: { id: conversationId, agentId },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })
    .then((conversation) => {
      if (!conversation) {
        throw new Response("Not Found", { status: 404 });
      }
      return conversation.messages.map((message) => {
        const messageContent = message.content as unknown as Message;
        return {
          ...messageContent,
          id: message.id,
        } as Message;
      });
    });

  const toolNames = toolNameIdentifierList();
  const chatSettings = getChatSettings(agentId);
  return {
    initialMessagesPromise,
    conversationId,
    agentId: agentId as string,
    toolNames,
    chatSettings,
  };
};

export default function Index() {
  const {
    initialMessagesPromise,
    conversationId,
    agentId,
    toolNames,
    chatSettings,
  } = useLoaderData<typeof loader>();
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex justify-center items-center">
          <Loader className="animate-spin w-4 h-4" />
        </div>
      }
    >
      <Await resolve={Promise.all([initialMessagesPromise, chatSettings])}>
        {([initialMessages, chatSettings]) => (
          <ClientOnlyComponent>
            {Chat && (
              <Chat
                initialConversationId={conversationId}
                initialMessages={initialMessages}
                agentId={agentId}
                toolNamesList={toolNames}
                agentChatSettings={chatSettings}
                anchorToBottom={false}
              />
            )}
          </ClientOnlyComponent>
        )}
      </Await>
    </Suspense>
  );
}
