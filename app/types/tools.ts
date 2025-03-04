import type { Tool } from "ai";

export type ToolParams = {
  conversationId: string;
  agentId: string;
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
