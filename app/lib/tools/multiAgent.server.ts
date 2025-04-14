import { tool } from "ai";
import type { ToolConfig, ToolParams } from "~/types/tools";
import { z } from "zod";
import { prisma } from "@db/db.server";
import { generateSingleMessage } from "../llm/generate.server";
import { getConfig } from "../config/config";

const invokeAgentDescription = `Call upon another agent to help with the current task.

Examples:
- "Can you help me with this task?"
- "I need someone to check this information."
- "Can you look into this for me?"
`;

export const invokeAgent = {
  identifier: "default__invokeAgent",
  name: "Invoke Agent",
  description: invokeAgentDescription,
  tool: async ({ agentId }: ToolParams) => {
    const possibleAgentsToCall = await prisma.agent
      .findMany({
        where: {
          id: {
            not: agentId,
          },
        },
        select: {
          id: true,
        },
      })
      .then((r) => r.map((a) => a.id));

    return tool({
      description: invokeAgentDescription,
      parameters: z.object({
        agentId: z
          .enum(possibleAgentsToCall as [string, ...string[]])
          .describe("The ID of the agent to invoke."),
        message: z.string().describe("The message to send to the agent."),
      }),
      execute: async ({ agentId, message }) => {
        const agent = await prisma.agent.findUnique({
          where: { id: agentId },
        });
        if (!agent) {
          return {
            error: "Agent not found.",
          };
        }

        const answer = await generateSingleMessage(getConfig())(
          message,
          agentId,
        );
        return {
          answer,
          agentName: agent.name,
        };
      },
    });
  },
} satisfies ToolConfig;
