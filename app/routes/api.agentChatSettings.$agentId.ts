import { prisma, type Message } from "@db/db.server";
import type { LoaderFunction } from "react-router";
import { getCorsHeaderForAgent } from "./utils";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";
import { getChatSettings } from "~/lib/llm/chat.server";

export const loader: LoaderFunction = async ({ params, request }) => {
  const corsHeaders = await getCorsHeaderForAgent(
    request.headers.get("Origin") as string,
    params.agentId as string
  );

  const agentId = params.agentId;
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
  });

  if (!agent || !agent.isPublic) {
    return new Response(
      JSON.stringify({
        error:
          "Agent not found or is not publicly accessible. Please verify the agent ID and public visibility settings.",
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  const conversationId = request.headers.get("x-conversation-id");
  const embedSessionId = request.headers.get("x-embed-session-id");

  let messages: Message[] = [];
  if (conversationId) {
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
        embedSessionId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
    if (conversation) {
      messages = conversation.messages;
    }
  }

  const toolNames = toolNameIdentifierList();

  const chatSettings = await getChatSettings(agentId as string);
  return new Response(JSON.stringify({ chatSettings, toolNames, messages }), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
};
