import type { OAKConfig } from "~/types/config";
import {
  generateConversation,
  generateSingleMessage,
} from "./llm/generate.server";
import { getPluginConfig, setPluginConfig } from "./plugins/config.server";
import {
  create,
  deleteMany,
  deleteOne,
  findMany,
  findUnique,
  update,
} from "./plugins/pluginData.server";
import type { MCPType, Prisma } from "@prisma/client";
import { updateKnowledgeSourcesQueue } from "./jobs/updateKnowledegeSources.server";
import type { User } from "@prisma/client";
import type { SessionUser } from "~/types/auth";
import {
  addMCPToAgent,
  getMCPsForAgent,
  removeMCPFromAgent,
} from "./mcp/client.server";

const OAKProvider = (
  config: OAKConfig,
  pluginIdentifier: string,
  user: User | SessionUser | null | undefined,
) => {
  return {
    generateSingleMessage: generateSingleMessage(config),
    generateConversation: generateConversation(config),
    getPluginConfig: (agentId: string) =>
      getPluginConfig(pluginIdentifier, agentId),
    setPluginConfig: (agentId: string, config: object) =>
      setPluginConfig(pluginIdentifier, agentId, config),
    enqueueSyncKnowledge: (agentId: string) => {
      return updateKnowledgeSourcesQueue.enqueue({
        agentId,
        plugin: pluginIdentifier,
      });
    },
    data: {
      findUnique: (agentId: string, identifier: string) =>
        findUnique(pluginIdentifier, agentId, identifier),
      findMany: (agentId: string, filter: Prisma.AgentPluginDataFindManyArgs) =>
        findMany(pluginIdentifier, agentId, filter),
      create: (agentId: string, data: object, identifier?: string) =>
        create(pluginIdentifier, agentId, data, identifier),
      update: (agentId: string, identifier: string, data: object) =>
        update(pluginIdentifier, agentId, identifier, data),
      deleteOne: (agentId: string, identifier: string) =>
        deleteOne(pluginIdentifier, agentId, identifier),
      deleteMany: (
        agentId: string,
        filter: Prisma.AgentPluginDataDeleteManyArgs,
      ) => deleteMany(pluginIdentifier, agentId, filter),
    },
    user: {
      getCurrentUser: async () => {
        return user;
      },
    },
    mcp: {
      getMCPsForAgent: async (agentId: string) => {
        return getMCPsForAgent(agentId);
      },
      addMCPToAgent: async (
        agentId: string,
        connection: {
          name: string;
          type: MCPType;
          connectionArgs:
            | { command: string; args?: string }
            | { url: string; headers?: Record<string, string> };
        },
      ) => {
        return addMCPToAgent(agentId, connection);
      },
      removeMCPFromAgent: async (agentId: string, mcpId: string) => {
        return removeMCPFromAgent(agentId, mcpId);
      },
    },
  };
};

export default OAKProvider;
