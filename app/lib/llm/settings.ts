import { prisma } from "@db/db.server";
import type { AgentSettings } from "~/types/agentSetting";

export const getAgentSettings = async (
  agentId: string,
): Promise<AgentSettings | null> => {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });
  if (!agent) {
    return null;
  }
  const settings = JSON.parse(agent.agentSettings as string) as AgentSettings;
  return settings;
};
