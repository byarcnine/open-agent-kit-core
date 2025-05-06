import { prisma } from "@db/db.server";
import { getSystemPrompt } from "./systemPrompts.server";
import {
  appendResponseMessages,
  smoothStream,
  streamText,
  type Message,
} from "ai";
import { getConfig } from "../config/config";
import { getModelContextLimit, getModelForAgent } from "./modelManager.server";
import { generateSingleMessage } from "./generate.server";
import { prepareToolsForAgent } from "./tools.server";
import { encoding_for_model, type TiktokenModel } from "tiktoken";

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

  const modelForAgent = await getModelForAgent(agentId, config);
  const TOKEN_LIMIT = getModelContextLimit(modelForAgent.modelId) * 0.8;

  // Add the user message to the conversation
  const createMessagePromise = prisma.message.create({
    data: {
      content: JSON.parse(JSON.stringify([messages[messages.length - 1]][0])),
      conversationId: conversation.id,
      author: "USER",
    },
  });

  const calculateTokens = (message: Message): number => {
    try {
      const enc = encoding_for_model(modelForAgent.modelId as TiktokenModel);
      const messageWithoutAttachments = {
        ...message,
        ...(message.experimental_attachments && {
          experimental_attachments: message.experimental_attachments.map(
            (attachment) => ({
              ...attachment,
              url: "",
            }),
          ),
        }),
      };
      const tokens = enc.encode(
        JSON.stringify(messageWithoutAttachments),
      ).length;
      enc.free();
      return tokens;
    } catch (error) {
      console.error("Error calculating tokens", error);
      return 0;
    }
  };

  const limitMessagesByTokens = (
    messages: Message[],
    maxTokens: number,
  ): Message[] => {
    let totalTokens = 0;
    const limitedMessages: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = calculateTokens(message);

      if (totalTokens + messageTokens > maxTokens) {
        break;
      }

      limitedMessages.unshift(message);
      totalTokens += messageTokens;
    }

    return limitedMessages;
  };

  const messagesInScope = limitMessagesByTokens(messages, TOKEN_LIMIT);

  const cleanedMessages = messagesInScope.filter((message) => {
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
      `Summarize in 3-4 words what this conversation is about. "${messages[0].content}"`,
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
  const toolsPromise = prepareToolsForAgent(
    agentId,
    conversation.id,
    meta,
    messages,
  );

  const [systemPrompt, tools, model] = await Promise.all([
    systemPromptPromise,
    toolsPromise,
    getModelForAgent(agentId, config),
    createMessagePromise,
  ]);
  const { tools: toolsArray, closeMCPs } = tools;

  return {
    stream: streamText({
      model,
      messages: cleanedMessages,
      system: systemPrompt,
      tools: { ...Object.fromEntries(toolsArray) },
      toolChoice: "auto",
      maxSteps: 25,
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
          messages: messagesInScope,
        });
        // close the tools
        await Promise.all([
          closeMCPs,
          prisma.message.create({
            data: {
              content: JSON.parse(
                JSON.stringify(messagesToStore[messagesToStore.length - 1]),
              ),
              conversationId: conversation.id,
              author: "ASSISTANT",
            },
          }),
          tagLinePromise || Promise.resolve(),
        ]);
      },
    }),
    conversationId: conversation.id,
  };
};
