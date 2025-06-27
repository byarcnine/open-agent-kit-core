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
  const spacePlugins = await prisma.pluginAvailability.findMany({
    where: {
      isGlobal: false,
      spaceId: {
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
  const relevantSpaces = await prisma.space.findMany({
    where: {
      id: {
        in: spacePlugins.map((sp) => sp.spaceId).filter((id) => id !== null),
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
    const spacesForPlugin = spacePlugins.filter(
      (sp) => sp.pluginIdentifier === p.name,
    );
    const agents = relevantAgents.filter((a) =>
      agentsForPlugin.some((ap) => ap.agentId === a.id),
    );
    const spaces = relevantSpaces.filter((s) =>
      spacesForPlugin.some((sp) => sp.spaceId === s.id),
    );
    return { ...p, isGlobal: globalPlugin !== undefined, agents, spaces };
  });
};

export const setPluginAvailability = async (
  pluginIdentifier: string,
  isGlobal: boolean,
  agentIds: string[],
  spaceIds: string[],
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
      if (agentIds.length > 0) {
        await tx.pluginAvailability.createMany({
          data: agentIds.map((agentId) => ({
            pluginIdentifier: pluginIdentifier,
            isEnabled: true,
            agentId: agentId,
          })),
        });
      }

      // Create individual records for each space
      if (spaceIds.length > 0) {
        await tx.pluginAvailability.createMany({
          data: spaceIds.map((spaceId) => ({
            pluginIdentifier: pluginIdentifier,
            isEnabled: true,
            spaceId: spaceId,
          })),
        });
      }
    }

    return true;
  });
};

export const getPluginsForAgent = async (agentId: string) => {
  // Get the agent to find its space
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { space: true },
  });

  if (!agent) {
    return [];
  }

  const enabledPlugins = await prisma.pluginAvailability.findMany({
    where: {
      OR: [
        { agentId, isEnabled: true },
        { spaceId: agent.spaceId, isEnabled: true },
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
      p.menuItems?.map((item) => ({ ...item, href: `${p.slug}${item.href}` })),
    )
    .filter((i) => !!i);
};

export const getUserRoutesForAgent = async (agentId: string) => {
  const plugins = await getPluginsForAgent(agentId);
  return plugins
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .flatMap((p) =>
      p.userRoutes?.map(() => ({
        title: p.displayName,
        slug: p.slug,
      })),
    )
    .filter((i) => !!i);
};

export const getPluginsForSpace = async (spaceId: string) => {
  const enabledPlugins = await prisma.pluginAvailability.findMany({
    where: {
      OR: [
        { spaceId: spaceId, isEnabled: true },
        { isGlobal: true, isEnabled: true },
      ],
    },
  });
  const plugins = getPlugins().filter((p) =>
    enabledPlugins.some((ep) => ep.pluginIdentifier === p.name),
  );
  return plugins;
};
