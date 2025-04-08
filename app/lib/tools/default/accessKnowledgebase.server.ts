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
  return tool({
    description: `Get information from your knowledge base to answer questions.`,
    parameters: z.object({
      question: z.string().describe("The user's question"),
      tags: z.array(z.string()).describe("An array of tag names to filter the search"),
    }),
    execute: async ({ question, tags }) => {
      const validTags = tags.filter(tag => availableTagNames.includes(tag));
      return await vectorSearch(question, agentId, validTags);
    },
  });
};

export default {
  identifier: "accessKnowledgeBase",
  name: "Access Knowledge Base",
  description: "Access the knowledge base",
  tool: accessKnowledgeBase,
} satisfies ToolConfig;
