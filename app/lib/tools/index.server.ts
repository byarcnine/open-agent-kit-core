import type { ToolConfig } from "~/types/tools";
import accessKnowledgebase from "./default/accessKnowledgebase.server";
import collectFeedback from "./default/collectFeedback.server";
import dateTimeAndDay from "./default/dateTimeAndDay.server";
import { invokeAgent } from "./multiAgent.server";

export const defaultTools: {
  tools: ToolConfig[];
} = {
  tools: [
    // Default tools
    dateTimeAndDay,
    collectFeedback,
    accessKnowledgebase,
    invokeAgent,
  ],
};
