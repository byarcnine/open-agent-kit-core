import {
  data,
  useLoaderData,
  useOutletContext,
  useParams,
  useRevalidator,
  type ActionFunctionArgs,
} from "react-router";
import Chat from "~/components/chat/chat.client";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import { getChatSettings } from "~/lib/llm/chat.server";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";
import { prisma } from "@db/db.server";
import { PERMISSIONS } from "~/types/auth";
import type { Message } from "ai";

export enum Intent {
  UPDATE_TAGLINE = "updateTagline",
  ARCHIVE_CONVERSATION = "archiveConversation",
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { agentId } = params;
  const user = await hasAccess(request, PERMISSIONS.VIEW_AGENT, agentId);
  if (!user) {
    return data({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const formData = await request.formData();
  const intent = formData.get("intent");
  switch (intent) {
    case Intent.UPDATE_TAGLINE: {
      const conversationId = formData.get("conversationId");
      const newTagline = formData.get("newTagline");

      try {
        await prisma.conversation.update({
          where: { id: conversationId as string },
          data: { tagline: newTagline as string },
        });
      } catch (error) {
        return data(
          { success: false, error: "Failed to update tagline" },
          { status: 500 },
        );
      }
      break;
    }
    case Intent.ARCHIVE_CONVERSATION: {
      const conversationId = formData.get("conversationId");
      await prisma.conversation.update({
        where: { id: conversationId as string },
        data: { archived: true },
      });
      break;
    }
    default:
      return data({ success: false, error: "Invalid intent" }, { status: 400 });
  }
  return data({ success: true });
};

export const loader = async ({ params }: { params: { agentId: string } }) => {
  const toolNamesPromise = toolNameIdentifierList();
  const chatSettingsPromise = getChatSettings(params.agentId);
  const [toolNames, chatSettings] = await Promise.all([
    toolNamesPromise,
    chatSettingsPromise,
  ]);
  return { toolNames, chatSettings };
};

export default function Index() {
  const { revalidate } = useRevalidator();
  const { agentId } = useParams();
  const context = useOutletContext<{
    onConversationStart: (conversationId: string) => void;
  }>();
  const { toolNames, chatSettings } = useLoaderData<typeof loader>();

  const onConversationStart = (conversationId: string) => {
    window.history.replaceState(
      {
        conversationId,
      },
      "",
      `/chat/${agentId}/${conversationId}`,
    );
    context.onConversationStart(conversationId);
  };
  const onMessage = (messages: Message[]) => {
    if (messages.filter((m) => m.role !== "user").length === 1) {
      // run this after the first AI message was received
      revalidate();
    }
  };
  return (
    <ClientOnlyComponent>
      {Chat && (
        <Chat
          key={agentId}
          onMessage={onMessage}
          onConversationStart={onConversationStart}
          agentId={agentId as string}
          toolNamesList={toolNames}
          anchorToBottom={false}
          agentChatSettings={chatSettings}
        />
      )}
    </ClientOnlyComponent>
  );
}
