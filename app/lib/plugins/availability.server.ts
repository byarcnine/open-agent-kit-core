import { getPlugins } from "~/lib/plugins/plugins.server";
import type { PluginWithAvailability } from "~/types/plugins";
import { prisma } from "@db/db.server";

export const getPluginsWithAvailability = async (): Promise<
  PluginWithAvailability[]
> => {
  const allPlugins = getPlugins();
  const globalPlugins = await prisma.pluginAvailability.findMany({
    where: {
      isGlobal: true,
    },
  });
  const agentPlugins = await prisma.pluginAvailability.findMany({
    where: {
      isGlobal: false,
      agentId: {
        not: null,
      },
    },
  });
  const relevantAgents = await prisma.agent.findMany({
    where: {
      id: {
        in: agentPlugins.map((ap) => ap.agentId).filter((id) => id !== null),
      },
    },
  });
  return allPlugins.map((p) => {
    const globalPlugin = globalPlugins.find(
      (gp) => gp.pluginIdentifier === p.name,
    );
    const agentsForPlugin = agentPlugins.filter(
      (ap) => ap.pluginIdentifier === p.name,
    );
    const agents = relevantAgents.filter((a) =>
      agentsForPlugin.some((ap) => ap.agentId === a.id),
    );
    return { ...p, isGlobal: globalPlugin !== undefined, agents };
  });
};

export const setPluginAvailability = async (
  pluginIdentifier: string,
  isGlobal: boolean,
  agentIds: string[],
) => {
  const plugin = getPlugins().find((p) => p.name === pluginIdentifier);
  if (!plugin) {
    throw new Error(`plugin ${pluginIdentifier} not found`);
  }

  return prisma.$transaction(async (tx) => {
    // First, delete all existing records for this tool
    await tx.pluginAvailability.deleteMany({
      where: {
        pluginIdentifier: pluginIdentifier,
      },
    });

    if (isGlobal) {
      // Create global availability record
      await tx.pluginAvailability.create({
        data: {
          pluginIdentifier: pluginIdentifier,
          isEnabled: true,
          isGlobal: true,
        },
      });
    } else {
      // Create individual records for each agent
      await tx.pluginAvailability.createMany({
        data: agentIds.map((agentId) => ({
          pluginIdentifier: pluginIdentifier,
          isEnabled: true,
          agentId: agentId,
        })),
      });
    }

    return true;
  });
};

export const getPluginsForAgent = async (agentId: string) => {
  const enabledPlugins = await prisma.pluginAvailability.findMany({
    where: {
      OR: [
        { agentId, isEnabled: true },
        { isGlobal: true, isEnabled: true },
      ],
    },
  });
  const plugins = getPlugins().filter((p) =>
    enabledPlugins.some((ep) => ep.pluginIdentifier === p.name),
  );
  return plugins;
};

export const getAgentPluginMenuItems = async (agentId: string) => {
  const plugins = await getPluginsForAgent(agentId);
  return plugins
    .flatMap((p) =>
      p.menuItems?.map((m) => ({ ...m, href: `${p.slug}${m.href}` })),
    )
    .filter((i) => !!i);
};

export const getUserRoutesForAgent = async (agentId: string) => {
  const plugins = await getPluginsForAgent(agentId);
  return plugins
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .flatMap((p) =>
      p.userRoutes?.map((m) => ({
        title: p.displayName,
        slug: p.slug,
      })),
    )
    .filter((i) => !!i);
};
