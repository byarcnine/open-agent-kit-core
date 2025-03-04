import vectorSearch from "~/lib/knowledge/vectorSearch.server";
import { tool } from "ai";
import { z } from "zod";
import type { ToolConfig, ToolParams } from "~/types/tools";

const accessKnowledgeBase = ({ agentId }: ToolParams) =>
  tool({
    description: `get information from your knowledge base to answer questions.`,
    parameters: z.object({
      question: z.string().describe("the users question"),
    }),
    execute: async ({ question }) => vectorSearch(question, agentId),
  });

export default {
  identifier: "accessKnowledgeBase",
  name: "Access Knowledge Base",
  description: "Access the knowledge base",
  tool: accessKnowledgeBase,
} satisfies ToolConfig;
