import { getPluginsForAgent } from "../plugins/availability.server";
import { getTools } from "../plugins/plugins.server";
import { defaultTools } from "./index.server";

export const getToolsForAgent = async (agentId: string) => {
  const agentPlugins = await getPluginsForAgent(agentId);
  const agentTools = await getTools(agentPlugins.map((p) => p.name));
  return [...agentTools, ...defaultTools.tools].filter((i) => !!i);
};

// Cache tool names to avoid re-calculating them.
// This is used in the chat component to display tool names.
// We cache the tool names because they are used in the chat component,
// and the chat component is rendered on every message.
// and they are the same for the entire instance.
let toolNamesCache: Record<string, string> | undefined;
export const toolNameIdentifierList = async () => {
  if (toolNamesCache) {
    return toolNamesCache;
  }
  const pluginTools = await getTools();
  const tools = [...pluginTools, ...defaultTools.tools];
  const toolNames = Object.fromEntries(
    tools.map((t) => [t.identifier, t.name]),
  ) as Record<string, string>;
  toolNamesCache = toolNames;
  return toolNames;
};
