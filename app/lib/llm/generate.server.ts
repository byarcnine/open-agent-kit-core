import { generateText, type CoreMessage } from "ai";
// import { getConfig } from "../config/config";
import { getSystemPrompt } from "./systemPrompts.server";
import { getToolsForAgent } from "../tools/tools.server";
import type { OAKConfig } from "~/types/config";
import { getModelForAgent } from "./modelManager.server";
import { getConfig } from "../config/config";
import OAKProvider from "../lib";

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
    const system =
      systemPrompt || (await getSystemPrompt("default", agentId)) || "";
    const model = await getModelForAgent(agentId, config);
    const tools = options?.disableTools
      ? undefined
      : await getToolsForAgent(agentId).then(async (r) => {
          // get tools ready
          return Promise.all(
            r.map(async (t) => {
              return [
                t.identifier,
                await t.tool({
                  conversationId: "0",
                  agentId,
                  config: getConfig(),
                  meta: {},
                  provider: OAKProvider(getConfig(), t.pluginName as string),
                }),
              ];
            }),
          );
        });
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
      toolChoice: options?.disableTools ? "none" : "auto",
      messages,
      tools: tools ? Object.fromEntries(tools) : undefined,
    });
    return completion.text;
  };

export const generateConversation =
  (config: OAKConfig) => async (agentId: string, messages: CoreMessage[]) => {
    const model = await getModelForAgent(agentId, config);
    const tools = await getToolsForAgent(agentId).then(async (r) => {
      // get tools ready
      return Promise.all(
        r.map(async (t) => {
          return [
            t.identifier,
            await t.tool({
              conversationId: "0",
              agentId,
              config: getConfig(),
              meta: {},
              provider: OAKProvider(getConfig(), t.pluginName as string),
            }),
          ];
        }),
      );
    });
    const completion = await generateText({
      model,
      tools: Object.fromEntries(tools),
      messages,
    });
    return completion.text;
  };
