import { prisma, type Message } from "@db/db.server";
import type { LoaderFunction } from "react-router";
import { getCorsHeaderForAgent } from "./utils";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";
import { getChatSettings } from "~/lib/llm/chat.server";
import jwt from 'jsonwebtoken';


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

  const conversationToken = request.headers.get("x-oak-conversation-token");
  let conversationId: string | undefined;
  if (conversationToken) {
    try {
      const decoded = jwt.verify(conversationToken, process.env.APP_SECRET as string);
      if (typeof decoded === "object" && decoded !== null && "conversationId" in decoded) {
        conversationId = decoded.conversationId as string;
      }
    } catch (error) {
      console.error("Error verifying conversation token:", error);
    }
  }


  let messages: Message[] = [];
  if (conversationId) {
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
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
      messages = conversation.messages.map(
        (message) => {
          const messageContent = message.content as unknown as Message;
          return {
            ...messageContent,
            id: message.id,
          } as Message;
        }
      );
    }
  }

  const toolNames = toolNameIdentifierList();

  const chatSettings = await getChatSettings(agentId as string);
  return new Response(JSON.stringify({ chatSettings, toolNames, messages, conversationValid: !!conversationId }), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
};
