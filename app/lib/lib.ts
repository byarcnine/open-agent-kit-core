import type { OAKConfig } from "~/types/config";
import { generateConversation, generateSingleMessage } from "./llm/generate";
import { getPluginConfig, setPluginConfig } from "./plugins/config.server";
import {
  create,
  deleteMany,
  deleteOne,
  findMany,
  findUnique,
  update,
} from "./plugins/pluginData";
import type { Prisma } from "@prisma/client";

const OAKProvider = (config: OAKConfig, pluginIdentifier: string) => {
  return {
    generateSingleMessage: generateSingleMessage(config),
    generateConversation: generateConversation(config),
    getPluginConfig: (agentId: string) =>
      getPluginConfig(pluginIdentifier, agentId),
    setPluginConfig: (agentId: string, config: object) =>
      setPluginConfig(pluginIdentifier, agentId, config),

    data: {
      findUnique: (agentId: string, identifier: string) =>
        findUnique(pluginIdentifier, agentId, identifier),
      findMany: (agentId: string, filter: Prisma.AgentPluginDataFindManyArgs) =>
        findMany(pluginIdentifier, agentId, filter),
      create: (agentId: string, data: object) =>
        create(pluginIdentifier, agentId, data),
      update: (agentId: string, identifier: string, data: object) =>
        update(pluginIdentifier, agentId, identifier, data),
      deleteOne: (agentId: string, identifier: string) =>
        deleteOne(pluginIdentifier, agentId, identifier),
      deleteMany: (
        agentId: string,
        filter: Prisma.AgentPluginDataDeleteManyArgs
      ) => deleteMany(pluginIdentifier, agentId, filter),
    },
  };
};

export default OAKProvider;
