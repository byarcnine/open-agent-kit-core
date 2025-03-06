import { prisma } from "@db/db.server";
import { getSystemPrompt } from "./systemPrompts.server";
import { getToolsForAgent } from "../tools/tools.server";
import {
  appendResponseMessages,
  convertToCoreMessages,
  smoothStream,
  streamText,
  type Message,
} from "ai";
import { getConfig } from "../config/config";
import { getModelForAgent } from "./modelManager";
import { generateSingleMessage } from "./generate";

export const streamConversation = async (
  conversationId: string,
  agentId: string,
  userId: string,
  customIdentifier: string,
  messages: Message[],
  meta: Record<string, any>
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
      content: JSON.parse(
        JSON.stringify(
          convertToCoreMessages([messages[messages.length - 1]])[0]
        )
      ),
      conversationId: conversation.id,
      author: "USER",
    },
  });

  let tagLinePromise: Promise<void> | null = null;
  if (!conversation.tagline) {
    tagLinePromise = generateSingleMessage(config)(
      `What is the main topic of the conversation with the initial message (3-4 words max): ${
        messages[messages.length - 1].content
      }`,
      agentId
    ).then(async (r) => {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { tagline: r },
      });
    });
  }

  const systemPromptPromise = getSystemPrompt("default", agentId);
  const toolsPromise = getToolsForAgent(agentId).then(async (r) => {
    // get tools ready
    return Promise.all(
      r.map(async (t) => {
        return [
          t.identifier,
          await t.tool({
            conversationId: conversation.id,
            agentId,
            meta,
          }),
        ];
      })
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
      messages: messages,
      system: systemPrompt,
      tools: Object.fromEntries(tools),
      toolChoice: "auto",
      maxSteps: 5,
      experimental_telemetry: {
        isEnabled: false,
      },
      experimental_transform: smoothStream({ chunking: "word" }),
      // onStepFinish: async (step) => {
      //   for (const toolResult of step.toolResults) {
      //     await prisma.message.create({
      //       data: {
      //         content: JSON.stringify(toolResult),
      //         conversationId: conversation.id,
      //         author: "TOOL",
      //       },
      //     });
      //   }
      // },
      onFinish: async (completion) => {
        console.log(
          "completion",
          JSON.stringify(completion.response.messages, null, 2)
        );
        // const coreMessage = convertToCoreMessages(completion.response.messages);
        // console.log("coreMessage", coreMessage);
        let usage = Number(completion.usage?.totalTokens ?? 0);
        if (isNaN(usage)) {
          usage = 0;
        }
        await prisma.usage.upsert({
          where: {
            agentId_year_month_day: {
              agentId: agentId,
              year: new Date().getFullYear(),
              month: new Date().getMonth() + 1,
              day: new Date().getDate(),
            },
          },
          create: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            day: new Date().getDate(),
            tokens: usage,
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
              JSON.stringify(messagesToStore[messagesToStore.length - 1])
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
