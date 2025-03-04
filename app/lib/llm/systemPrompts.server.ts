import { prisma } from "@db/db.server";

export const getSystemPrompt = async (key: string, agentId: string) => {
  const systemPrompt = await prisma.systemPrompt.findFirst({
    where: { key, agentId },
    orderBy: { createdAt: "desc" },
  });
  return systemPrompt?.prompt;
};

export const createSystemPrompt = async (
  key: string,
  prompt: string,
  agentId: string
) => {
  await prisma.systemPrompt.create({ data: { key, prompt, agentId } });
};
