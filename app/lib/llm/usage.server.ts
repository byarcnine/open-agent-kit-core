import type { StepResult, ToolContent } from "ai";
import { prisma } from "@db/db.server";

type AICompletionType = Omit<StepResult<any>, "stepType" | "isContinued"> & {
  readonly steps: StepResult<any>[];
};

export const trackUsageForMessageResponse = async (
  completion: AICompletionType,
  agentId: string,
  modelId: string,
  initiator: string,
  userId?: string,
) => {
  let inputTokens = Number(completion.usage?.promptTokens ?? 0);
  let outputTokens = Number(completion.usage?.completionTokens ?? 0);
  if (isNaN(inputTokens)) {
    inputTokens = 0;
  }
  if (isNaN(outputTokens)) {
    outputTokens = 0;
  }
  const upsertModelUsage = await prisma.usage.upsert({
    where: {
      agentId_year_month_day_modelId_initiator: {
        agentId: agentId,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        day: new Date().getDate(),
        modelId: modelId,
        initiator: initiator,
      },
    },
    create: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      invocations: 1,
      modelId: modelId,
      initiator: initiator,
      agent: {
        connect: {
          id: agentId,
        },
      },
      user: userId
        ? {
            connect: {
              id: userId,
            },
          }
        : undefined,
    },
    update: {
      inputTokens: {
        increment: inputTokens,
      },
      outputTokens: {
        increment: outputTokens,
      },
      invocations: {
        increment: 1,
      },
    },
  });

  const toolsCalls = completion.response.messages
    .filter((message) => message.role === "tool")
    .flatMap((message) =>
      (message.content as ToolContent).map((part) => part.toolName),
    );
  await Promise.all([
    upsertModelUsage,
    ...toolsCalls.map(async (toolCall) => {
      await prisma.usage.upsert({
        where: {
          agentId_year_month_day_modelId_initiator: {
            agentId: agentId,
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            day: new Date().getDate(),
            modelId,
            initiator: toolCall,
          },
        },
        create: {
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          day: new Date().getDate(),
          inputTokens: 0,
          outputTokens: 0,
          modelId,
          initiator: toolCall,
          invocations: 1,
          agent: {
            connect: {
              id: agentId,
            },
          },
          user: userId
            ? {
                connect: {
                  id: userId,
                },
              }
            : undefined,
        },
        update: {
          invocations: {
            increment: 1,
          },
        },
      });
    }),
  ]);
};
