import { generateText, type CoreMessage, type Message } from "ai";
import { getSystemPrompt } from "./systemPrompts.server";
import type { OAKConfig } from "~/types/config";
import { getModelForAgent } from "./modelManager.server";
import { prepareToolsForAgent } from "./tools.server";
import { trackUsageForMessageResponse } from "./usage.server";
import type { SessionUser } from "~/types/auth";
import type { User } from "@prisma/client";

export const generateSingleMessage =
  (config: OAKConfig) =>
  async (
    prompt: string,
    agentId: string,
    systemPrompt?: string | null, // system prompt override
    options?: {
      disableTools?: boolean;
    },
    initiator?: string, // for tracking purposes provide the name and reason of the plugin invoking the LLM
    user?: User | SessionUser,
  ) => {
    const [system = "", model, tools] = await Promise.all([
      systemPrompt || getSystemPrompt("default", agentId),
      getModelForAgent(agentId, config),
      prepareToolsForAgent(agentId, "0", {}, [], user),
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
      temperature: model.settings?.temperature ?? 0.7,
      toolChoice: options?.disableTools ? "none" : "auto",
      messages,
      tools: tools?.tools ? Object.fromEntries(tools.tools) : undefined,
    });
    await tools.closeMCPs();
    await trackUsageForMessageResponse(
      completion,
      agentId,
      model.model.modelId,
      initiator ?? "generateSingleMessage_unknown",
      user?.id,
    );
    return completion.text;
  };

export const generateConversation =
  (config: OAKConfig) =>
  async (
    agentId: string,
    messages: Message[],
    user?: User | SessionUser,
    systemPrompt?: string | null, // system prompt override
    options?: {
      disableTools?: boolean;
    },
    initiator?: string, // for tracking purposes provide the name and reason of the plugin invoking the LLM
  ) => {
    const [system, model, tools] = await Promise.all([
      systemPrompt ?? getSystemPrompt("default", agentId),
      getModelForAgent(agentId, config),
      prepareToolsForAgent(agentId, "0", {}, messages, user),
    ]);
    const completion = await generateText({
      model: model.model,
      temperature: model.settings?.temperature ?? 0.7,
      tools: Object.fromEntries(tools.tools),
      toolChoice: options?.disableTools ? "none" : "auto",
      messages,
      system,
    });
    await trackUsageForMessageResponse(
      completion,
      agentId,
      model.model.modelId,
      initiator ?? "generateConversation_unknown",
      user?.id,
    );
    await tools.closeMCPs();
    return completion.text;
  };
