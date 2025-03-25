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
  findManyArgs: Prisma.AgentPluginDataFindManyArgs
) => {
  return prisma.agentPluginData.findMany({
    ...findManyArgs,
    where: {
      ...(findManyArgs.where || {}),
      agentId,
      pluginIdentifier,
    },
  });
};

export const create = async (
  pluginIdentifier: string,
  agentId: string,
  identifier: string = cuid(),
  data: any,
) => {
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
  deleteManyArgs: Prisma.AgentPluginDataDeleteManyArgs
) => {
  return prisma.agentPluginData.deleteMany({
    where: {
      ...(deleteManyArgs.where || {}),
      agentId,
      pluginIdentifier,
    },
  });
};
