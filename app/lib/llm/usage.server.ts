import type { StepResult, ToolContent } from "ai";
import { Prisma, prisma } from "@db/db.server";
import dayjs from "dayjs";
import type { Limits } from "~/types/llm";

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

// export const timeRangeOptions = [
//   { value: "7", label: "Last 7 days" },
//   { value: "30", label: "Last 30 days" },
//   { value: "90", label: "Last 90 days" },
// ];

// export const getUsageForAgent = async (agentId: string, time: string) => {
//   if (!agentId || !time) return undefined;

//   const days = parseInt(time, 10);
//   if (isNaN(days)) {
//     throw new Error("Invalid time range provided");
//   }

//   const startDate = new Date();
//   startDate.setDate(startDate.getDate() - days);

//   return await prisma.usage.findMany({
//     where: {
//       agentId: agentId,
//       createdAt: {
//         gte: startDate,
//       },
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//   });
// };

export const getUsageForType = async (
  type: "space" | "agent" | "user",
  entityId: string,
  period: number,
) => {
  let filter: Prisma.UsageWhereInput = {};
  if (type === "space") {
    filter = {
      agent: {
        space: {
          id: entityId,
        },
      },
    };
  } else if (type === "agent") {
    filter = {
      agentId: entityId,
    };
  } else if (type === "user") {
    filter = {
      userId: entityId,
    };
  }

  const startDate = dayjs().subtract(period, "day").toDate();

  return prisma.usage.aggregate({
    where: {
      ...filter,
      year: {
        gte: startDate.getFullYear(),
      },
      month: {
        gte: startDate.getMonth() + 1,
      },
      day: {
        gte: startDate.getDate(),
      },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
  });
};

export const checkLimitForAgent = async (
  agentId: string,
  spaceId: string,
  userId: string,
  period: number,
) => {
  const limits = await prisma.globalConfig.findFirst({
    where: {
      key: "activeLimits",
    },
  });
  const activeLimits = (limits?.value as Limits | null) || { activeLimits: [] };
  const relevantLimits = activeLimits.activeLimits.filter((limit) => {
    if (limit.type === "agent") {
      return limit.entityId === agentId;
    }
    if (limit.type === "space") {
      return limit.entityId === spaceId;
    }
    if (limit.type === "user") {
      return limit.entityId === userId;
    }
    return false;
  });
  const spaceLimit = relevantLimits.reduce((acc, limit) => {
    if (limit.type === "space") {
      return Math.min(acc, limit.limit);
    }
    return acc;
  }, Infinity);
  const agentLimit = relevantLimits.reduce((acc, limit) => {
    if (limit.type === "agent") {
      return Math.min(acc, limit.limit);
    }
    return acc;
  }, Infinity);
  const userLimit = relevantLimits.reduce((acc, limit) => {
    if (limit.type === "user") {
      return Math.min(acc, limit.limit);
    }
    return acc;
  }, Infinity);

  const [agentUsage, spaceUsage, userUsage] = await Promise.all([
    getUsageForType("agent", agentId, period),
    getUsageForType("space", spaceId, period),
    getUsageForType("user", userId, period),
  ]).then((usages) => {
    return usages.map((usage) => {
      return Number(usage._sum.inputTokens) + Number(usage._sum.outputTokens);
    });
  });
  return (
    agentUsage > agentLimit || spaceUsage > spaceLimit || userUsage > userLimit
  );
};
