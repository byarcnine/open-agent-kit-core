import { getPluginsForAgent } from "../plugins/availability.server";
import { getTools } from "../plugins/plugins.server";
import accessKnowledgebase from "./default/accessKnowledgebase.server";
import accessWeb from "./default/accessWeb.server";
import collectFeedback from "./default/collectFeedback.server";
import dateTimeAndDay from "./default/dateTimeAndDay.server";
import type { DefaultTools } from "~/types/tools";

const getDefaultTools = (defaultTools?: DefaultTools) => {
  return [
    // Default tools
    dateTimeAndDay,
    defaultTools?.captureFeedback ? collectFeedback : undefined,
    defaultTools?.knowledgeBase ? accessKnowledgebase : undefined,
    defaultTools?.accessWeb ? accessWeb : undefined,
  ]
    .filter((t) => !!t)
    .map((t) => ({
      ...t,
      identifier: `default__${t.identifier}`,
      pluginName: "default",
    }));
};

export const getToolsForAgent = async (
  agentId: string,
  defaultTools?: DefaultTools,
) => {
  const agentPlugins = await getPluginsForAgent(agentId);
  const agentTools = await getTools(agentPlugins.map((p) => p.name));
  const def = getDefaultTools(defaultTools);

  return [...agentTools, ...def].filter((i) => !!i);
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
  const tools = [
    ...pluginTools,
    ...getDefaultTools({
      captureFeedback: true,
      knowledgeBase: true,
      accessWeb: true,
    }),
  ];
  const toolNames = Object.fromEntries(
    tools.map((t) => [t.identifier, t.name]),
  ) as Record<string, string>;
  toolNamesCache = toolNames;
  return toolNames;
};
