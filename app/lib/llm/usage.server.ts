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
  const currentDate = new Date(); // Calculate date components once
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const day = currentDate.getDate();

  let inputTokens = Number(completion.usage?.promptTokens ?? 0);
  let outputTokens = Number(completion.usage?.completionTokens ?? 0);
  if (isNaN(inputTokens)) {
    inputTokens = 0;
  }
  if (isNaN(outputTokens)) {
    outputTokens = 0;
  }

  // Upsert model usage first
  await prisma.usage.upsert({
    where: {
      agentId_year_month_day_modelId_initiator: {
        agentId: agentId,
        year: year,
        month: month,
        day: day,
        modelId: modelId,
        initiator: initiator,
      },
    },
    create: {
      year: year,
      month: month,
      day: day,
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

  const toolsCalls =
    completion.response.messages
      .filter((message) => message.role === "tool")
      .flatMap((message) =>
        (message.content as ToolContent).map((part) => part.toolName),
      ) ?? [];

  // Sequentially upsert tool usage
  for (const toolCall of toolsCalls) {
    await prisma.usage.upsert({
      where: {
        agentId_year_month_day_modelId_initiator: {
          agentId: agentId,
          year: year,
          month: month,
          day: day,
          modelId, // modelId is part of the unique key for tool usage as well
          initiator: toolCall,
        },
      },
      create: {
        year: year,
        month: month,
        day: day,
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
  }
};
