import { generateText, type CoreMessage, type Message } from "ai";
import { getSystemPrompt } from "./systemPrompts.server";
import type { OAKConfig } from "~/types/config";
import { getModelForAgent } from "./modelManager.server";
import { prepareToolsForAgent } from "./tools.server";

export const generateSingleMessage =
  (config: OAKConfig) =>
  async (
    prompt: string,
    agentId: string,
    systemPrompt?: string | null, // system prompt override
    options?: {
      disableTools?: boolean;
    },
  ) => {
    const [system = "", model, tools] = await Promise.all([
      systemPrompt || getSystemPrompt("default", agentId),
      getModelForAgent(agentId, config),
      prepareToolsForAgent(agentId, "0", {}, []),
    ]);

    const messages: CoreMessage[] = [
      {
        role: "system",
        content: system,
      },
      {
        role: "user",
        content: prompt,
      },
    ];
    const completion = await generateText({
      model: model.model,
      temperature: model.settings.temperature || 0.7,
      toolChoice: options?.disableTools ? "none" : "auto",
      messages,
      tools: tools?.tools ? Object.fromEntries(tools.tools) : undefined,
    });
    await tools.closeMCPs();
    return completion.text;
  };

export const generateConversation =
  (config: OAKConfig) => async (agentId: string, messages: Message[]) => {
    const [model, tools] = await Promise.all([
      getModelForAgent(agentId, config),
      prepareToolsForAgent(agentId, "0", {}, messages),
    ]);
    const completion = await generateText({
      model: model.model,
      temperature: model.settings.temperature || 0.7,
      tools: Object.fromEntries(tools.tools),
      messages,
    });
    await tools.closeMCPs();
    return completion.text;
  };
