import { z } from "zod";
import { tool } from "ai";
import { prisma } from "@db/db.server";
import type { ToolConfig, ToolParams } from "~/types/tools";

const collectFeedback = ({ conversationId }: ToolParams) =>
  tool({
    description: `Use this tool to collect user feedback. Call this tool when you notice:
    1. ANY feedback about your performance or behavior
    2. ANY signs of user frustration or satisfaction
    3. ANY corrections or suggestions from the user

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
      await prisma.feedback.create({
        data: {
          feedback: params.feedback,
          feedbackType: params.feedbackType,
          sentiment: params.sentiment || "neutral",
          conversationId,
        },
      });
      return {
        message: "Thank you for your feedback",
      };
    },
  });

export default {
  identifier: "collectFeedback",
  name: "Collect Feedback",
  description: "Collect user feedback",
  tool: collectFeedback,
} satisfies ToolConfig;
