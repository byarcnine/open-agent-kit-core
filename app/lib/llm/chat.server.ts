import { prisma } from "@db/db.server";
import type { ChatSettings } from "~/types/chat";
import {
  getModelForAgent,
  supportedFileTypesForModel,
} from "./modelManager.server";
import { getConfig } from "../config/config";

export const getChatSettings = async (
  agentId: string
): Promise<ChatSettings | null> => {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });
  if (!agent) {
    return null;
  }
  const settings = JSON.parse(agent.chatSettings as string) as ChatSettings;
  const model = await getModelForAgent(agentId, getConfig());
  if (settings?.enableFileUpload) {
    settings.supportedFileTypes = supportedFileTypesForModel(model.provider);
  }
  return settings;
};
