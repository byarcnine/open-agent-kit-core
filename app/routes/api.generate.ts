import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
} from "react-router";
import { canUserAccessAgent } from "~/lib/auth/hasAccess.server";
import { getSession } from "~/lib/auth/auth.server";
import { streamConversation } from "~/lib/llm/streamConversation.server";
import { getCorsHeaderForAgent } from "./utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const origin = request.headers.get("Origin") || "";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const body = await request.json();
  const agentId = body.agentId;

  const corsHeaders = await getCorsHeaderForAgent(
    request.headers.get("Origin") as string,
    agentId
  );

  const session = await getSession(request);
  const userId = session?.user.id;

  const clientConversationId = body.conversationId;
  const customIdentifier = body.customIdentifier;
  // the meta object can be access by the tool
  const meta = body.meta || {};
  // make sure the agent is public or the user has access to the agent
  const canAccess = await canUserAccessAgent(session?.user, agentId);
  if (!canAccess) {
    return data(
      { error: "Unauthorized" },
      {
        status: 403,
        headers: corsHeaders,
      }
    );
  }

  try {
    const { stream, conversationId } = await streamConversation(
      clientConversationId,
      agentId,
      userId,
      customIdentifier,
      body.messages,
      meta
    );
    return stream.toDataStreamResponse({
      headers: {
        "x-conversation-id": conversationId,
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
    return data(
      { error: "An error occurred" },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
};
