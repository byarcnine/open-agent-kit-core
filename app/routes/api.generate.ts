import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { verifyChatSessionTokenForPublicAgent } from "~/lib/auth/hasAccess.server";
import { getSession } from "~/lib/auth/auth.server";
import { streamConversation } from "~/lib/llm/streamConversation.server";
import {
  getCorsHeaderForAgent,
  CORS_ALLOW_HEADERS,
  CORS_ALLOW_METHODS,
  CORS_EXPOSE_HEADERS,
} from "./utils";
import jwt from "jsonwebtoken";
import { getChatSettings } from "~/lib/llm/chat.server";
// import { checkPermissionHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
// import { PERMISSION } from "~/lib/permissions/permissions";
import { prisma } from "@db/db.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const origin = request.headers.get("Origin") || "";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
        "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
        "Access-Control-Expose-Headers": CORS_EXPOSE_HEADERS,
      },
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const body = await request.json();
  const agentId = body.agentId;

  const corsHeaders = await getCorsHeaderForAgent(
    request.headers.get("Origin") as string,
    agentId,
  );

  const session = await getSession(request);
  const userId = session?.user.id;

  const clientConversationId = body.conversationId;
  const customIdentifier = body.customIdentifier;
  // the meta object can be access by the tool
  const meta = body.meta || {};
  // make sure the agent is public or the user has access to the agent
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
  });
  if (!agent) {
    return new Response(JSON.stringify({ error: "Agent not found" }), {
      status: 404,
      headers: corsHeaders,
    });
  }
  if (userId) {
    await hasAccessHierarchical(request, PERMISSION["agent.chat"], agentId);
  } else if (agent.isPublic) {
    const chatSessionAllowed = await verifyChatSessionTokenForPublicAgent(
      request,
      agentId,
    );
    if (!chatSessionAllowed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: corsHeaders,
      });
    }
  } else {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  try {
    const { stream, conversationId } = await streamConversation(
      clientConversationId,
      agentId,
      userId,
      customIdentifier,
      body.messages,
      meta,
    );

    const chatSettings = await getChatSettings(agentId);
    const maintainConversationSession =
      chatSettings?.embedSettings?.maintainConversationSession;

    const oakConversationToken = session?.user.id
      ? undefined
      : jwt.sign({ conversationId }, process.env.APP_SECRET || ("" as string), {
          expiresIn: (maintainConversationSession || 0) * 60,
        });

    return stream.toDataStreamResponse({
      headers: {
        "x-conversation-id": conversationId,
        ...(oakConversationToken
          ? { "x-oak-conversation-token": oakConversationToken }
          : {}),
        ...corsHeaders,
      },
      getErrorMessage(error) {
        if (process.env.NODE_ENV === "development") {
          if (error instanceof Error) {
            return error.message;
          }
          return "An error occurred";
        }
        return "An error occurred";
      },
    });
  } catch (error) {
    console.error(error);
    let message = "An error occurred";
    if (error instanceof Error) {
      message = error.message;
    }
    return new Response(message, {
      status: 500,
      headers: corsHeaders,
    });
  }
};
