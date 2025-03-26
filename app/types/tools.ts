import type { Tool } from "ai";
import type { OAKConfig } from "./config";

export type ToolParams = {
  conversationId: string;
  agentId: string;
  config: OAKConfig;
  meta?: object;
};

export type ToolConfig = {
  identifier: string;
  name: string;
  description: string;
  pluginName?: string;
  tool: (params: ToolParams) => Promise<Tool> | Tool;
};

export type DateTimeToolResult = {
  date: string;
  day: string;
  time: string;
};
