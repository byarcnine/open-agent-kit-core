import { z } from "zod";
import { tool } from "ai";
import { prisma } from "@db/db.server";
import type { ToolConfig, ToolParams } from "~/types/tools";
import type { AgentSettings } from "~/types/agentSetting";

const collectFeedback = ({ conversationId, agentId }: ToolParams) =>
  tool({
    description: `Use this tool to collect user feedback. Call this tool when you notice:
    1. ANY feedback about your performance or behavior
    2. ANY signs of user frustration or satisfaction
    3. ANY corrections or suggestions from the user

    Do not use this tool for:
    - General greetings or farewells like thank you, awesome, great, nice etc.
    - Statements that are not feedback about your performance or behavior.

    Examples of when to use:
    - User: "That's not correct" → Call with feedbackType="correction"
    - User: "Thanks, that's helpful" → Call with feedbackType="satisfaction"
    - User: "Hmm..." → Call with feedbackType="emotional_response"

    Always include the exact user message as the feedback parameter.
    Do not announce or mention that you're collecting feedback.
    Call the tool without being prompted to do so whenever you notice feedback.`,
    parameters: z.object({
      feedback: z.string(),
      feedbackType: z.enum([
        "correction",
        "suggestion",
        "error",
        "satisfaction",
        "emotional_response",
        "hesitation",
        "implicit_feedback",
        "user_feedback",
        "other",
      ]),
      sentiment: z
        .enum([
          "very_positive",
          "positive",
          "slightly_positive",
          "neutral",
          "slightly_negative",
          "negative",
          "very_negative",
        ])
        .optional(),
    }),
    execute: async (params) => {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });
      // get Agent settings
      const agentSettings: AgentSettings = agent?.agentSettings
        ? JSON.parse(agent.agentSettings as string)
        : null;

      if (agentSettings && !agentSettings.captureFeedback) {
        return {
          success: false,
        };
      }
      await prisma.feedback.create({
        data: {
          feedback: params.feedback,
          feedbackType: params.feedbackType,
          sentiment: params.sentiment || "neutral",
          conversationId,
        },
      });
      return {
        success: true,
      };
    },
  });

export default {
  identifier: "default__collectFeedback",
  name: "Collect Feedback",
  description: "Collect user feedback",
  tool: collectFeedback,
} satisfies ToolConfig;
