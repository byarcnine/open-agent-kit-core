import {
  useFetcher,
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
import type { JsonValue } from "@prisma/client/runtime/library";
import MonthDatepicker from "~/components/ui/monthDatepicker";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";

interface SpaceWithAgents {
  _count: {
    agents: number;
  };
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  description: string | null;
  spaceId: string;
  isActive: boolean;
  modelSettings: JsonValue;
  allowedAgents: AgentWithUsage[];
  totalTokens?: number;
}

interface Usage {
  id: string;
  inputTokens: bigint;
  outputTokens: bigint;
  modelId: string | null;
  userId: string | null;
  year: number;
  month: number;
  agentId: string;
  totalTokens?: number;
}

interface AgentUsage {
  id: string;
  inputTokens: number;
  outputTokens: number;
  modelId: string | null;
  userId: string | null;
  year: number;
  month: number;
  agentId: string;
  totalTokens?: number;
}

interface AgentWithUsage {
  id: string;
  name: string;
  spaceId: string;
  isActive: boolean;
  modelSettings: JsonValue;
  usage?: AgentUsage | undefined;
}

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
    const agentUsage = usageForAgents.find(
      (usage) => usage.agentId === agent.id,
    );
    agent.usage = agentUsage
      ? ({
          ...agentUsage,
          inputTokens: Number(agentUsage.inputTokens),
          outputTokens: Number(agentUsage.outputTokens),
          totalTokens:
            Number(agentUsage.inputTokens || 0) +
            Number(agentUsage.outputTokens || 0),
        } as AgentUsage)
      : undefined;
  });

  const spacesWithAgents = (await Promise.all(
    spaces.reverse().map(async (space) => {
      return {
        ...space,
        totalTokens: agents.reduce(
          (acc, agent) =>
            acc +
            (agent.usage?.totalTokens || 0) *
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
      const agentUsage = usageForAgents.find(
        (usage) => usage.agentId === agent.id,
      );
      agent.usage = agentUsage
        ? {
            ...agentUsage,
            inputTokens: Number(agentUsage.inputTokens),
            outputTokens: Number(agentUsage.outputTokens),
            totalTokens:
              Number(agentUsage.inputTokens || 0) +
              Number(agentUsage.outputTokens || 0),
          }
        : undefined;
    });
  });

  spaces.forEach((space) => {
    space.totalTokens = space.allowedAgents.reduce(
      (acc, agent) => acc + (agent.usage?.totalTokens || 0),
      0,
    );
  });

  return {
    filteredUsage: spaces as SpaceWithAgents[],
  };
};

const Analytics = () => {
  const { spacesWithAgents } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [usage, setUsage] = useState<SpaceWithAgents[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetcher.submit(
      {
        selectedDate: selectedDate?.toISOString() || "",
        agentData: JSON.stringify(spacesWithAgents),
      },
      { method: "POST", action: "/analytics" },
    );
  }, [selectedDate]);

  useEffect(() => {
    if (fetcher.data?.filteredUsage) {
      setUsage(fetcher.data.filteredUsage);
    } else {
      setUsage(spacesWithAgents as SpaceWithAgents[]);
    }
  }, [fetcher.data, spacesWithAgents]);

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
            onMonthSelect={(selectedDate) => setSelectedDate(selectedDate)}
            placeholder="Choose month"
            className="w-64 mb-2"
          />
          <Warning description="Red indicators show usage > 75% of monthly token limit." />
        </div>
        <Card className="px-0 py-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="max-md:hidden">Type</TableHead>
                <TableHead className="max-md:hidden">Status/Model</TableHead>
                <TableHead>Token Usage (Monthly)</TableHead>
                <TableHead>
                  <div className="pr-2 ml-auto">Manage</div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.map((space) => (
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
                      {space.allowedAgents.length} Agents
                    </TableCell>
                    <TableCell className="w-100">
                      {space.totalTokens ? (
                        <TokenProgressBar
                          limit={500000}
                          used={space.totalTokens}
                        />
                      ) : (
                        "n/a"
                      )}
                    </TableCell>
                    <TableCell className="w-10">
                      <div className="text-right">
                        <Button className="ml-auto" variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {space?.allowedAgents?.length > 0 &&
                    space.allowedAgents.map((agent) => (
                      <TableRow key={agent.id} className="h-15">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ChevronRight size={14} />
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
                            {agent?.usage?.modelId || "n/a"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {agent?.usage?.totalTokens ? (
                            <TokenProgressBar
                              limit={50000}
                              used={agent.usage.totalTokens}
                            />
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-right">
                            <Button
                              className="ml-auto"
                              variant="outline"
                              size="sm"
                            >
                              Manage
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </>
              ))}
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
