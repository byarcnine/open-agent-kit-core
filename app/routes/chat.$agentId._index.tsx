import { data, useLoaderData, useParams, useRevalidator, type ActionFunctionArgs } from "react-router";
import Chat from "~/components/chat/chat.client";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import { getChatSettings } from "~/lib/llm/chat.server";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";
import { prisma } from "@db/db.server";
import { PERMISSIONS } from "~/types/auth";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { agentId } = params;
  const user = await hasAccess(request, PERMISSIONS.VIEW_AGENT, agentId);
  if (!user) {
    return data({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const formData = await request.formData();
  const conversationId = formData.get("conversationId");
  const newTagline = formData.get("newTagline");

  try {
    await prisma.conversation.update({
      where: { id: conversationId as string },
      data: { tagline: newTagline as string },
    });
  } catch (error) {
    return data({ success: false, error: "Failed to update tagline" }, { status: 500 });
  }

  return data({ success: true });
};

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
