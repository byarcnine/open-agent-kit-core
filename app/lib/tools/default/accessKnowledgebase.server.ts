import vectorSearch from "~/lib/knowledge/vectorSearch.server";
import { tool } from "ai";
import { z } from "zod";
import type { ToolConfig, ToolParams } from "~/types/tools";
import { prisma } from "@db/db.server"; // Ensure you have access to your Prisma client

const accessKnowledgeBase = async ({ agentId }: ToolParams) => {
  const availableTags = await prisma.knowledgeDocumentTag.findMany({
    where: { agentId },
    select: { name: true },
  });

  const availableTagNames = availableTags.map(tag => tag.name) as [string, ...string[]];

  // Create a Zod enum from availableTagNames
  const TagsEnum = z.enum(availableTagNames);

  return tool({
    description: `Get information from your knowledge base to answer questions.`,
    parameters: z.object({
      question: z.string().describe("The user's question"),
      tags: z.array(TagsEnum).describe("An array of tag names to filter the search"),
    }),
    execute: async ({ question, tags }) => {
      return await vectorSearch(question, agentId, tags);
    },
  });
};

export default {
  identifier: "accessKnowledgeBase__default",
  name: "Access Knowledge Base",
  description: "Access the knowledge base",
  tool: accessKnowledgeBase,
} satisfies ToolConfig;
