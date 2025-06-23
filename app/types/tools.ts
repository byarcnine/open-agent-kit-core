import type { Message, Tool } from "ai";
import type { OAKConfig } from "./config";
import type OAKProvider from "~/lib/lib";

export type ToolParams = {
  conversationId: string;
  agentId: string;
  config: OAKConfig;
  provider: ReturnType<typeof OAKProvider>;
  meta?: object;
  messages?: Message[];
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

export type DefaultTools = {
  captureFeedback?: boolean;
  knowledgeBase?: boolean;
  accessWeb?: boolean;
};
