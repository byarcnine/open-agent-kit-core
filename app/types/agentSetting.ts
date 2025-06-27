import type { PluginType } from "./plugins";

export interface AgentSettings {
  hasKnowledgeBase: boolean;
  captureFeedback: boolean;
  trackingEnabled: boolean;
  plugins: PluginType[];
  systemPrompt: string;
}
