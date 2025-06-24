import {
  useFetcher,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";

import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";

import {
  allowedAgentsToViewForUser,
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import { prisma } from "@db/db.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { SessionUser } from "~/types/auth";
import Warning from "~/components/ui/warning";
import { Card } from "~/components/ui/card";
import MonthDatepicker from "~/components/ui/monthDatepicker";
import { useEffect, useState } from "react";
import CostControlTable from "~/components/costControl/costControlTable";
import type {
  AgentUsage,
  AgentWithUsage,
  SpaceWithAgents,
  Usage,
} from "~/types/costControl";
import Checkbox from "~/components/ui/checkbox";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.super_admin"],
  );

  const userScopes = await getUserScopes(user);
  const allowedAgents = await allowedAgentsToViewForUser(user);

  const spaces = await prisma.space.findMany({
    include: {
      _count: {
        select: {
          agents: true,
        },
      },
    },
    where: {
      agents: {
        some: {
          id: {
            in: allowedAgents,
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const agents = (await prisma.agent.findMany({
    where: {
      id: {
        in: allowedAgents,
      },
    },
    select: {
      id: true,
      name: true,
      spaceId: true,
      isActive: true,
      modelSettings: true,
    },
  })) as AgentWithUsage[];

  const currentDate = new Date();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  );

  const usageForAgents: Usage[] = await prisma.usage.findMany({
    where: {
      agentId: {
        in: allowedAgents,
      },
      createdAt: {
        gte: firstDayOfMonth,
        lte: lastDayOfMonth,
      },
    },
    select: {
      id: true,
      inputTokens: true,
      outputTokens: true,
      modelId: true,
      userId: true,
      year: true,
      month: true,
      agentId: true,
    },
  });

  // add usage data to agents
  agents.forEach((agent) => {
    const agentUsage = usageForAgents.filter(
      (usage) => usage.agentId === agent.id,
    );

    const usageData: Record<string, AgentUsage> = {};

    if (agentUsage) {
      agentUsage.forEach((usage) => {
        const modelId = usage.modelId || "unknown_model";
        if (!usageData[modelId]) {
          usageData[modelId] = {
            id: usage.id,
            inputTokens: Number(usage.inputTokens),
            outputTokens: Number(usage.outputTokens),
            modelId: usage.modelId,
            userId: usage.userId,
            year: usage.year,
            month: usage.month,
            agentId: usage.agentId,
            totalTokens: Number(usage.inputTokens) + Number(usage.outputTokens),
          };
        } else {
          usageData[modelId].inputTokens += Number(usage.inputTokens);
          usageData[modelId].outputTokens += Number(usage.outputTokens);
          usageData[modelId] = usageData[modelId] ?? {
            id: usage.id,
            inputTokens: 0,
            outputTokens: 0,
            modelId: usage.modelId,
            userId: usage.userId,
            year: usage.year,
            month: usage.month,
            agentId: usage.agentId,
            totalTokens: 0,
          };
          usageData[modelId].totalTokens =
            (usageData[modelId].totalTokens || 0) +
            Number(usage.inputTokens) +
            Number(usage.outputTokens);
        }
      });
    }
    agent.usage = Object.values(usageData).sort((a, b) => {
      return (a.modelId || "").localeCompare(b.modelId || "");
    }) as AgentUsage[];
  });

  const spacesWithAgents = (await Promise.all(
    spaces.reverse().map(async (space) => {
      return {
        ...space,
        totalTokens: agents.reduce(
          (acc, agent) =>
            acc +
            (agent.usage?.reduce(
              (sum, usage) => sum + (usage.totalTokens || 0),
              0,
            ) || 0) *
              (agent.spaceId === space.id ? 1 : 0),
          0,
        ),
        allowedAgents: agents.filter((agent) => agent.spaceId === space.id),
      };
    }),
  )) as SpaceWithAgents[];

  return {
    user: user as SessionUser,
    userScopes,
    spacesWithAgents,
  };
};

export const action = async ({ request }: LoaderFunctionArgs) => {
  const formData = await request.formData();
  const selectedDate = formData.get("selectedDate");
  const spacesWithAgents = formData.get("agentData");
  const spaces = JSON.parse(spacesWithAgents as string) as SpaceWithAgents[];
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.super_admin"],
  );
  const allowedAgents = await allowedAgentsToViewForUser(user);

  const currentDate = selectedDate
    ? new Date(String(selectedDate))
    : new Date();
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );
  const lastDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  );

  const usageForAgents = await prisma.usage.findMany({
    where: {
      agentId: {
        in: allowedAgents,
      },
      createdAt: {
        gte: firstDayOfMonth,
        lte: lastDayOfMonth,
      },
    },
    select: {
      id: true,
      inputTokens: true,
      outputTokens: true,
      modelId: true,
      userId: true,
      year: true,
      month: true,
      agentId: true,
    },
  });

  spaces.forEach((space) => {
    space.allowedAgents.forEach((agent) => {
      const agentUsage = usageForAgents.filter(
        (usage) => usage.agentId === agent.id,
      );

      const usageData: Record<string, AgentUsage> = {};

      if (agentUsage) {
        agentUsage.forEach((usage) => {
          const modelId = usage.modelId || "unknown_model";
          if (!usageData[modelId]) {
            usageData[modelId] = {
              id: usage.id,
              inputTokens: Number(usage.inputTokens),
              outputTokens: Number(usage.outputTokens),
              modelId: usage.modelId,
              userId: usage.userId,
              year: usage.year,
              month: usage.month,
              agentId: usage.agentId,
              totalTokens:
                Number(usage.inputTokens) + Number(usage.outputTokens),
            };
          } else {
            usageData[modelId].inputTokens += Number(usage.inputTokens);
            usageData[modelId].outputTokens += Number(usage.outputTokens);
            usageData[modelId] = usageData[modelId] ?? {
              id: usage.id,
              inputTokens: 0,
              outputTokens: 0,
              modelId: usage.modelId,
              userId: usage.userId,
              year: usage.year,
              month: usage.month,
              agentId: usage.agentId,
              totalTokens: 0,
            };
            usageData[modelId].totalTokens =
              (usageData[modelId].totalTokens || 0) +
              Number(usage.inputTokens) +
              Number(usage.outputTokens);
          }
        });
      }

      agent.usage = Object.values(usageData).sort((a, b) => {
        return (a.modelId || "").localeCompare(b.modelId || "");
      }) as AgentUsage[];
    });
  });

  spaces.forEach((space) => {
    space.totalTokens = space.allowedAgents.reduce(
      (acc, agent) =>
        acc +
        (agent.usage?.reduce(
          (sum, usage) => sum + (usage.totalTokens || 0),
          0,
        ) || 0),
      0,
    );
  });

  return {
    filteredUsage: spaces as SpaceWithAgents[],
  };
};

const CostControl = () => {
  const { user, userScopes, spacesWithAgents } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [usage, setUsage] = useState<SpaceWithAgents[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetcher.submit(
      {
        selectedDate: selectedDate?.toISOString() || "",
        agentData: JSON.stringify(spacesWithAgents),
      },
      { method: "POST", action: "/cost_control" },
    );
  }, [selectedDate]);

  useEffect(() => {
    if (fetcher.data?.filteredUsage) {
      //  setUsage(fetcher.data.filteredUsage);
    } else {
      setUsage(spacesWithAgents as SpaceWithAgents[]);
    }
  }, [fetcher.data, spacesWithAgents]);

  return (
    <Layout navComponent={<OverviewNav userScopes={userScopes} />} user={user}>
      <div className="w-full py-8 px-4 md:p-8 flex flex-col">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-medium">Cost Control Management</h1>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-medium mb-8">
            Token Usage by Space, Agent & User
          </h2>
          <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
            <MonthDatepicker
              onMonthSelect={(selectedDate) => setSelectedDate(selectedDate)}
              placeholder="Choose month"
              className="w-64 mb-2"
            />
            <Warning description="Red indicators show usage > 75% of monthly token limit." />
          </div>
          <CostControlTable usage={usage} />
        </div>
      </div>
    </Layout>
  );
};

export default CostControl;
