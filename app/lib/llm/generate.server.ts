import { generateText, type CoreMessage } from "ai";
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
  ) => {
    const [system = "", model, tools] = await Promise.all([
      systemPrompt || getSystemPrompt("default", agentId),
      getModelForAgent(agentId, config),
      prepareToolsForAgent(agentId, "0", {}),
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
      model,
      messages,
      tools: Object.fromEntries(tools.tools),
    });
    await tools.closeMCPs();
    return completion.text;
  };

export const generateConversation =
  (config: OAKConfig) => async (agentId: string, messages: CoreMessage[]) => {
    const [model, tools] = await Promise.all([
      getModelForAgent(agentId, config),
      prepareToolsForAgent(agentId, "0", {}),
    ]);
    const completion = await generateText({
      model,
      tools: Object.fromEntries(tools.tools),
      messages,
    });
    await tools.closeMCPs();
    return completion.text;
  };
