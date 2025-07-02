import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";

import {
  allowedAgentsToViewForUser,
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import { prisma } from "@db/db.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { SessionUser } from "~/types/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { ChevronRight, Home, User } from "react-feather";
import { Badge } from "~/components/ui/badge";
import Warning from "~/components/ui/warning";
import { Card } from "~/components/ui/card";
import Bubble from "~/components/ui/bubble";
import TokenProgressBar from "~/components/ui/tokenProgressBar";
import MonthDatepicker from "~/components/ui/monthDatepicker";
import dayjs from "dayjs";
import ReactECharts, { type EChartsOption } from "echarts-for-react";
import ClientOnlyComponent, {
  ClientOnly,
} from "~/components/clientOnlyComponent/clientOnlyComponent";

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
  const allowedAgents = await allowedAgentsToViewForUser(user);

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

  const usageForAgents = await prisma.usage.groupBy({
    by: ["agentId", "modelId"],
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
    where: {
      month: selectedMonth.getMonth() + 1,
      year: selectedMonth.getFullYear(),
    },
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
        <Card className="px-0 py-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="max-md:hidden">Type</TableHead>
                <TableHead className="max-md:hidden">Status/Model</TableHead>
                <TableHead>Token Usage (Monthly)</TableHead>
                {/* <TableHead>
                  <div className="pr-2 ml-auto">Manage</div>
                </TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {spaces.map((space) => {
                const totalTokens = space.agents
                  .filter((agent) =>
                    usageForAgents.some((usage) => usage.agentId === agent.id),
                  )
                  .reduce((acc, agent) => {
                    const usages = usageForAgents.filter(
                      (usage) => usage.agentId === agent.id,
                    );
                    return (
                      acc +
                      Number(
                        usages.reduce(
                          (acc, usage) =>
                            acc + Number(usage._sum.inputTokens || 0),
                          0,
                        ) || 0,
                      ) +
                      Number(
                        usages.reduce(
                          (acc, usage) =>
                            acc + Number(usage._sum.outputTokens || 0),
                          0,
                        ) || 0,
                      )
                    );
                  }, 0);
                return (
                  <>
                    <TableRow className="bg-blue-100 h-15" key={space.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 h-full truncate">
                          <div className="aspect-square w-8 h-8 rounded-md bg-white flex items-center justify-center">
                            <Home size={14} />
                          </div>
                          {space.name}
                        </div>
                      </TableCell>
                      <TableCell className="max-md:hidden w-25">
                        <Badge reduced disabled>
                          Space
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-md:hidden w-40">
                        {space.agents.length} Agents
                      </TableCell>
                      <TableCell className="w-100">
                        {totalTokens ? (
                          <TokenProgressBar limit={500000} used={totalTokens} />
                        ) : (
                          "n/a"
                        )}
                      </TableCell>
                    </TableRow>
                    {space?.agents?.length > 0 &&
                      space.agents.map((agent) => {
                        const agentUsage = usageForAgents.filter(
                          (usage) => usage.agentId === agent.id,
                        );

                        const totalTokens = agentUsage.reduce(
                          (acc, usage) =>
                            acc +
                            Number(usage._sum.inputTokens || 0) +
                            Number(usage._sum.outputTokens || 0),
                          0,
                        );

                        return (
                          <TableRow key={agent.id} className="h-15 ">
                            <TableCell>
                              <div className="flex items-center gap-2 pl-4">
                                {/* <ChevronRight size={14} /> */}
                                <div className="aspect-square w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center max-md:hidden">
                                  <User size={14} />
                                </div>
                                {agent.id}
                              </div>
                            </TableCell>
                            <TableCell className="max-md:hidden">
                              <Badge variant="green" reduced disabled>
                                Agent
                              </Badge>
                            </TableCell>
                            <TableCell className="max-md:hidden">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Bubble isActive={agent.isActive} />{" "}
                                {usageForAgents?.[0]?.modelId || "n/a"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {totalTokens ? (
                                <TokenProgressBar
                                  limit={50000}
                                  used={totalTokens}
                                />
                              ) : (
                                "-"
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </Card>
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
