import { prisma } from "@db/db.server";
import type { LoaderFunction } from "react-router";
import { getCorsHeaderForAgent } from "./utils";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";

export const loader: LoaderFunction = async ({ params, request }) => {
  const corsHeaders = await getCorsHeaderForAgent(request.headers.get("Origin") as string, params.agentId as string);

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

  const toolNames = toolNameIdentifierList();

  const chatSettings = agent.chatSettings;
  return new Response(JSON.stringify({ chatSettings, toolNames }), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
};
