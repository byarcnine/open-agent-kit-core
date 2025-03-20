import { Prisma, prisma } from "@db/db.server";
import cuid from "cuid";

export const findUnique = async (
  pluginIdentifier: string,
  agentId: string,
  identifier: string
) => {
  return prisma.agentPluginData.findUnique({
    where: {
      agentId_identifier_pluginIdentifier: {
        agentId,
        identifier,
        pluginIdentifier,
      },
    },
  });
};

export const findMany = async (
  pluginIdentifier: string,
  agentId: string,
  filter: Prisma.AgentPluginDataFindManyArgs
) => {
  return prisma.agentPluginData.findMany({
    ...filter,
    where: {
      ...(filter.where || {}),
      agentId,
      pluginIdentifier,
    },
  });
};

export const create = async (
  pluginIdentifier: string,
  agentId: string,
  data: any
) => {
  const identifier = cuid();
  return prisma.agentPluginData.create({
    data: {
      agentId,
      identifier,
      pluginIdentifier,
      data,
    },
  });
};

export const update = async (
  pluginIdentifier: string,
  agentId: string,
  identifier: string,
  data: any
) => {
  return prisma.agentPluginData.update({
    where: {
      agentId_identifier_pluginIdentifier: {
        agentId,
        identifier,
        pluginIdentifier,
      },
    },
    data,
  });
};

export const deleteOne = async (
  pluginIdentifier: string,
  agentId: string,
  identifier: string
) => {
  return prisma.agentPluginData.delete({
    where: {
      agentId_identifier_pluginIdentifier: {
        agentId,
        identifier,
        pluginIdentifier,
      },
    },
  });
};

export const deleteMany = async (
  agentId: string,
  pluginIdentifier: string,
  filter: Prisma.AgentPluginDataDeleteManyArgs
) => {
  return prisma.agentPluginData.deleteMany({
    where: {
      ...(filter.where || {}),
      agentId,
      pluginIdentifier,
    },
  });
};
