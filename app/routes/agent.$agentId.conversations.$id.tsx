import { prisma } from "@db/db.server";
import { useLoaderData, useParams } from "react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Chat from "~/components/chat/chat.client";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";
import type { Message } from "ai";
import { getChatSettings } from "~/lib/llm/chat.server";

// Add this line near the top of the file
dayjs.extend(relativeTime);

export const loader = async ({
  params,
}: {
  params: { agentId: string; id: string };
}) => {
  const { agentId, id } = params;
  const conversation = await prisma.conversation.findUnique({
    where: { id: id, agentId },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
  if (!conversation) {
    throw new Response("Not Found", { status: 404 });
  }
  const toolNames = toolNameIdentifierList();
  const initialMessages = conversation.messages.map(
    (message) => message.content as unknown as Message,
  );
  const chatSettings = await getChatSettings(agentId);
  return { conversation, initialMessages, toolNames, chatSettings };
};

const ConversationDetail = () => {
  const { agentId } = useParams();
  const { initialMessages, conversation, toolNames, chatSettings } =
    useLoaderData<typeof loader>();

  return (
    <div className="h-full w-full flex flex-col max-h-screen">
      <div className="p-4 border-b sticky top-0 bg-white z-10 flex-shrink-0">
        <h1 className="text-2xl font-medium">
          Conversation{" "}
          <span className="text-base text-muted-foreground">
            #{conversation.id}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Started {dayjs(conversation.createdAt).fromNow()}
        </p>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden py-4">
        <ClientOnlyComponent>
          {Chat && (
            <Chat
              initialConversationId={conversation.id}
              initialMessages={initialMessages}
              disableInput
              agentId={agentId as string}
              toolNamesList={toolNames}
              agentChatSettings={chatSettings}
            />
          )}
        </ClientOnlyComponent>
      </div>
    </div>
  );
};

export default ConversationDetail;
