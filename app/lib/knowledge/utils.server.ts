import { prisma } from "@db/db.server";

export const getDocumentsByAgentId = async (agentId: string) => {
  return await prisma.knowledgeDocument.findMany({
    where: {
      agentId,
    },
  });
};
