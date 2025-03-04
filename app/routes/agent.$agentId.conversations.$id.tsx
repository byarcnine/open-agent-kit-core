import { prisma } from "@db/db.server";
import { useLoaderData, useParams } from "react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Chat from "~/components/chat/chat.client";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";

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
  const initialMessages = conversation.messages.map((message) => ({
    id: message.id,
    role:
      message.author === "USER"
        ? "user"
        : ("assistant" as "user" | "assistant"),
    content: message.author !== "TOOL" ? message.content : "",
    toolInvocations:
      message.author === "TOOL" ? [JSON.parse(message.content)] : undefined,
  }));
  return { conversation, initialMessages };
};

const ConversationDetail = () => {
  const { agentId } = useParams();
  const { initialMessages, conversation } = useLoaderData<typeof loader>();

  return (
    <div className="h-full w-full flex flex-col max-h-screen">
      <div className="p-4 border-b">
        <h1 className="text-3xl font-bold">
          Conversation{" "}
          <span className="text-base text-muted-foreground">
            #{conversation.id}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Started {dayjs(conversation.createdAt).fromNow()}
        </p>
      </div>
      <ClientOnlyComponent>
        {Chat && (
          <Chat
            initialConversationId={conversation.id}
            initialMessages={initialMessages}
            disableInput
            agentId={agentId as string}
          />
        )}
      </ClientOnlyComponent>
    </div>
  );
};

export default ConversationDetail;
