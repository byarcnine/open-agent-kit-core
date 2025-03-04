import { getPluginsForAgent } from "../plugins/availability.server";
import { getTools } from "../plugins/plugins.server";
import { defaultTools } from "./index.server";

export const getToolsForAgent = async (agentId: string) => {
  const agentPlugins = await getPluginsForAgent(agentId);
  const agentTools = agentPlugins.flatMap((p) =>
    p.tools?.map((t) => ({ ...t, identifier: `${p.name}__${t.identifier}` }))
  );
  return [...agentTools, ...defaultTools.tools].filter((i) => !!i);
};

export const toolNameIdentifierList = () => {
  const pluginTools = getTools();
  const tools = [...pluginTools, ...defaultTools.tools];
  const toolNames = Object.fromEntries(
    tools.map((t) => [
      t.pluginName ? `${t.pluginName}__${t.identifier}` : t.identifier,
      t.name,
    ])
  ) as Record<string, string>;
  return toolNames;
};
