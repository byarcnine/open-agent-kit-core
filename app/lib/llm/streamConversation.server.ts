import { prisma } from "@db/db.server";
import { getSystemPrompt } from "./systemPrompts.server";
import { getToolsForAgent } from "../tools/tools.server";
import {
  appendResponseMessages,
  smoothStream,
  streamText,
  type Message,
} from "ai";
import { getConfig } from "../config/config";
import { getModelForAgent } from "./modelManager.server";
import { generateSingleMessage } from "./generate.server";
import OAKProvider from "../lib";

export const streamConversation = async (
  conversationId: string,
  agentId: string,
  userId: string,
  customIdentifier: string,
  messages: Message[],
  meta: Record<string, any>,
) => {
  const conversation = conversationId
    ? await prisma.conversation.findUnique({ where: { id: conversationId } })
    : await prisma.conversation.create({
        data: { agentId, userId, customIdentifier },
      });

  if (!conversation) {
    throw new Error("Conversation not found");
  }
  const config = getConfig();

  // Add the user message to the conversation
  const createMessagePromise = prisma.message.create({
    data: {
      content: JSON.parse(JSON.stringify([messages[messages.length - 1]][0])),
      conversationId: conversation.id,
      author: "USER",
    },
  });

  // filter out tool results without a result.
  // this happens if a tools errors out
  // it break the streamText function otherwise
  const cleanedMessages = messages.filter((message) => {
    if (message.role === "assistant") {
      return !message.parts?.some(
        (part) =>
          part.type === "tool-invocation" &&
          part.toolInvocation.state !== "result",
      );
    }
    return true;
  });

  let tagLinePromise: Promise<void> | null = null;
  if (!conversation.tagline) {
    tagLinePromise = generateSingleMessage(config)(
      messages[0].content,
      agentId,
      "What is the conversation about? Tell me in 3-4 words. Only return the tagline, no other text. Only summarize the topic of the conversation. Do not engage in the conversation, just return the tagline. Maintain the prompt language for your output.",
      {
        disableTools: true,
      },
    )
      .then(async (r) => {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { tagline: r.trim() },
        });
      })
      .catch((e) => {
        console.error("Error generating tagline", e);
      });
  }

  const systemPromptPromise = getSystemPrompt("default", agentId);
  const toolsPromise = getToolsForAgent(agentId).then(async (r) => {
    return Promise.all(
      r.map(async (t) => {
        try {
          return [
            t.identifier,
            await t.tool({
              conversationId: conversation.id,
              agentId,
              meta,
              config: getConfig(),
              provider: OAKProvider(getConfig(), t.pluginName as string),
            }),
          ];
        } catch (error) {
          console.error("Error invoking tool", error);
          return [t.identifier, `Error invoking tool: ${error}`];
        }
      }),
    );
  });

  const [systemPrompt, tools, model] = await Promise.all([
    systemPromptPromise,
    toolsPromise,
    getModelForAgent(agentId, config),
    createMessagePromise,
  ]);
  return {
    stream: streamText({
      model,
      messages: cleanedMessages,
      system: systemPrompt,
      tools: Object.fromEntries(tools),
      toolChoice: "auto",
      maxSteps: 5,
      experimental_telemetry: {
        isEnabled: false,
      },
      experimental_transform: smoothStream({ chunking: "word" }),
      onFinish: async (completion) => {
        let usage = Number(completion.usage?.totalTokens ?? 0);
        if (isNaN(usage)) {
          usage = 0;
        }
        await prisma.usage.upsert({
          where: {
            agentId_year_month_day_modelId: {
              agentId: agentId,
              year: new Date().getFullYear(),
              month: new Date().getMonth() + 1,
              day: new Date().getDate(),
              modelId: model.modelId,
            },
          },
          create: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            day: new Date().getDate(),
            tokens: usage,
            modelId: model.modelId,
            agent: {
              connect: {
                id: agentId,
              },
            },
          },
          update: {
            tokens: {
              increment: usage,
            },
          },
        });
        const messagesToStore = appendResponseMessages({
          responseMessages: completion.response.messages,
          messages,
        });
        await prisma.message.create({
          data: {
            content: JSON.parse(
              JSON.stringify(messagesToStore[messagesToStore.length - 1]),
            ),
            conversationId: conversation.id,
            author: "ASSISTANT",
          },
        });
        if (tagLinePromise) {
          await tagLinePromise;
        }
      },
    }),
    conversationId: conversation.id,
  };
};
