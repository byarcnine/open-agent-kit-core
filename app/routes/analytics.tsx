import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import {
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import { prisma } from "@db/db.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { SessionUser } from "~/types/auth";
import { Card } from "~/components/ui/card";
import MonthDatepicker from "~/components/ui/monthDatepicker";
import dayjs from "dayjs";
import ReactECharts, { type EChartsOption } from "echarts-for-react";
import { ClientOnly } from "~/components/clientOnlyComponent/clientOnlyComponent";
import CostControlTable from "~/components/costControl/costControlTable";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.super_admin"],
  );

  const url = new URL(request.url);
  const selectedMonth = (
    url.searchParams.get("month")
      ? dayjs(url.searchParams.get("month") as string)
      : dayjs()
  )
    .set("date", 15)
    .set("hour", 12)
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0)
    .toDate();

  const userScopes = await getUserScopes(user);
  // const allowedAgents = await allowedAgentsToViewForUser(user);

  const spaces = await prisma.space.findMany({
    include: {
      _count: {
        select: {
          agents: true,
        },
      },
      agents: {
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          spaceId: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const usageForAgents = await prisma.usage
    .groupBy({
      by: ["agentId", "modelId"],
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
      where: {
        month: selectedMonth.getMonth() + 1,
        year: selectedMonth.getFullYear(),
      },
    })
    .then((d) => {
      return d.map((d) => ({
        modelId: d.modelId,
        agent: spaces
          .find((s) => s.agents.some((a) => a.id === d.agentId))
          ?.agents.find((a) => a.id === d.agentId),
        space: spaces.find((s) => s.agents.some((a) => a.id === d.agentId)),
        inputTokens: Number(d._sum.inputTokens || 0),
        outputTokens: Number(d._sum.outputTokens || 0),
      }));
    });
  // const spaces = await prisma.space.findMany({
  //   include: {
  //     agents: true,
  //   },
  // });
  // PIE CHART: Usage per Space
  const usagePerAgent = await prisma.usage.groupBy({
    by: ["agentId"],
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
    where: {
      month: selectedMonth.getMonth() + 1,
      year: selectedMonth.getFullYear(),
    },
  });

  const usagePerSpace = Object.fromEntries(
    spaces.map((space) => [
      space.id,
      usagePerAgent.reduce((acc, usage) => {
        if (space.agents.some((agent) => agent.id === usage.agentId)) {
          return (
            acc +
            Number(usage._sum.inputTokens || 0) +
            Number(usage._sum.outputTokens || 0)
          );
        }
        return acc;
      }, 0),
    ]),
  );

  // LINE CHART: Total Usage Per Day
  const usagePerDay = await prisma.usage
    .groupBy({
      by: ["day"],
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
      where: {
        month: selectedMonth.getMonth() + 1,
        year: selectedMonth.getFullYear(),
      },
      orderBy: { day: "asc" },
    })
    .then((d) => {
      return d.map((d) => ({
        ...d,
        total:
          Number(d._sum.inputTokens || 0) + Number(d._sum.outputTokens || 0),
      }));
    });

  // BAR CHART: Input/Output Tokens per Agent (Top 15)
  // const usagePerAgent = await prisma.usage.groupBy({
  //   by: ["agentId"],
  //   _sum: {
  //     inputTokens: true,
  //     outputTokens: true,
  //   },
  //   where: {
  //     month: selectedMonth.getMonth() + 1,
  //     year: selectedMonth.getFullYear(),
  //   },
  // });

  // Sort and take top 15
  const topAgents = usagePerAgent
    .map((agent) => ({
      ...agent,
      total:
        Number(agent._sum.inputTokens || 0) +
        Number(agent._sum.outputTokens || 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 15);

  return {
    user: user as SessionUser,
    userScopes,
    spaces,
    usageForAgents,
    usagePerSpace,
    usagePerDay,
    topAgents,
    selectedMonth,
  };
};

export type AgentUsageData = Awaited<
  ReturnType<typeof loader>
>["usageForAgents"];
export type SpacesData = Awaited<ReturnType<typeof loader>>["spaces"];

const Analytics = () => {
  const {
    spaces,
    usageForAgents,
    selectedMonth,
    usagePerSpace,
    usagePerDay,
    topAgents,
  } = useLoaderData<typeof loader>();
  const daysInMonth = dayjs(selectedMonth).daysInMonth();
  // Pie Chart
  const pieOption = {
    tooltip: { trigger: "item" },
    grid: {
      top: 100,
    },
    legend: {
      top: 10,
    },
    series: [
      {
        radius: ["40%", "70%"],
        avoidLabelOverlap: false,
        padAngle: 5,
        itemStyle: {
          borderRadius: 10,
        },
        name: "Usage",
        type: "pie",
        data: Object.entries(usagePerSpace).map(([key, value]) => ({
          name: key,
          value: value,
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0,0,0,0.5)",
          },
        },
      },
    ],
  } satisfies EChartsOption;

  // Line Chart
  const lineOption = {
    legend: {
      top: 10,
    },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: Array.from({ length: daysInMonth }, (_, i) => i + 1),
    },
    yAxis: {
      type: "value",
      name: "Tokens (M)",
      axisLabel: {
        align: "right",
        formatter: (value: number) => {
          const inMillions = value / 1000000;
          return inMillions.toFixed(2) + "M";
        },
      },
    },
    series: [
      {
        name: "Total Usage",
        type: "line",
        data: Array.from({ length: daysInMonth }).map((_, i) =>
          usagePerDay.reduce(
            (acc, d) => (d.day < i + 1 ? acc + d.total : acc),
            0,
          ),
        ),
      },
    ],
  };
  // Bar Chart
  const barOption = {
    tooltip: { trigger: "axis" },
    legend: { data: ["Input Tokens", "Output Tokens"] },
    xAxis: { type: "category", data: topAgents.map((a) => a.agentId) },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => {
          const inMillions = value / 1000000;
          return inMillions.toFixed(2) + "M";
        },
      },
    },
    series: [
      {
        name: "Input Tokens",
        type: "bar",
        data: topAgents.map((a) => a._sum.inputTokens),
        axisLabel: {
          formatter: (value: number) => {
            const inMillions = value / 1000000;
            return inMillions.toFixed(2) + "M";
          },
        },
      },
      {
        name: "Output Tokens",
        type: "bar",
        data: topAgents.map((a) => a._sum.outputTokens),
        axisLabel: {
          formatter: (value: number) => {
            const inMillions = value / 1000000;
            return inMillions.toFixed(2) + "M";
          },
        },
      },
    ],
  };

  return (
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
            placeholder="Choose month"
            className="w-64 mb-2"
            key={selectedMonth.toISOString()}
            name="month"
            selectedMonth={selectedMonth}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="py-4">
            <h2 className="text-lg font-medium mb-4">Usage per Space</h2>
            <ClientOnly
              component={() => (
                <ReactECharts option={pieOption} style={{ height: 400 }} />
              )}
            />
          </Card>
          <Card className="py-4">
            <h2 className="text-lg font-medium mb-4">Usage per Day</h2>
            <ClientOnly
              component={() => (
                <ReactECharts option={lineOption} style={{ height: 400 }} />
              )}
            />
          </Card>

          <Card className="py-4">
            <h2 className="text-lg font-medium mb-4">Usage per Agent</h2>
            <ClientOnly
              component={() => (
                <ReactECharts option={barOption} style={{ height: 400 }} />
              )}
            />
          </Card>
        </div>
        <CostControlTable agentUsage={usageForAgents} spaces={spaces} />
      </div>
    </div>
  );
};

export const meta: MetaFunction = () => {
  return [
    { title: "Analytics" },
    { name: "description", content: "Analytics" },
  ];
};

export default Analytics;
