import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Home,
  Package,
  Search,
  User,
} from "react-feather";
import { Badge } from "../ui/badge";
import TokenProgressBar from "../ui/tokenProgressBar";
import { Button } from "../ui/button";
import Bubble from "../ui/bubble";
import { cn } from "~/lib/utils";
import Checkbox from "../ui/checkbox";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import type { Agent, Space } from "@prisma/client";
import type { AgentUsageData, SpacesData } from "~/routes/analytics";

type CostControlTableProps = {
  agentUsage: AgentUsageData;
  spaces: SpacesData;
};

const CostControlTable: React.FC<CostControlTableProps> = ({
  agentUsage,
  spaces,
}) => {
  // Group agentUsage by spaceId
  const groupBySpace = React.useCallback(() => {
    const grouped: Record<
      string,
      {
        space: Space;
        agents: Record<
          string,
          {
            agent: Agent;
            usage: typeof agentUsage;
          }
        >;
        totalTokens: number;
      }
    > = {};

    spaces.forEach((space) => {
      grouped[space.id] = {
        space,
        agents: {},
        totalTokens: 0,
      };

      space.agents.forEach((agent) => {
        // Find all usage records for this agent in this space
        const usageArr = agentUsage.filter(
          (u) => u.agent.id === agent.id && u.space.id === space.id,
        );
        grouped[space.id].agents[agent.id] = {
          agent,
          usage: usageArr,
        };
        grouped[space.id].totalTokens += usageArr.reduce(
          (sum, usage) =>
            sum + (usage.inputTokens || 0) + (usage.outputTokens || 0),
          0,
        );
      });
    });

    return grouped;
  }, [spaces, agentUsage]);

  const [expandedSpaces, setExpandedSpaces] = React.useState<string[]>([]);
  const [expandedRows, setExpandedRows] = React.useState<string[]>([]);
  const [hideAgentsWithoutUsage, setHideAgentsWithoutUsage] =
    useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [filteredSpaces, setFilteredSpaces] = useState<string[]>([]);

  // Filtering logic
  useEffect(() => {
    const grouped = groupBySpace();
    let spaceIds = Object.keys(grouped);

    // Only filter spaces (not agents) here
    if (hideAgentsWithoutUsage) {
      spaceIds = spaceIds.filter((spaceId) => {
        const agents = Object.values(grouped[spaceId].agents);
        return agents.some(
          (a) =>
            a.usage &&
            a.usage.reduce(
              (sum, usage) =>
                sum + (usage.inputTokens || 0) + (usage.outputTokens || 0),
              0,
            ) > 0,
        );
      });
    }

    if (search) {
      spaceIds = spaceIds.filter((spaceId) => {
        const space = grouped[spaceId].space;
        const agents = Object.values(grouped[spaceId].agents);
        return (
          space.name.toLowerCase().includes(search.toLowerCase()) ||
          agents.some((a) =>
            a.agent.id.toLowerCase().includes(search.toLowerCase()),
          )
        );
      });
    }

    setFilteredSpaces(spaceIds);
    setExpandedSpaces(spaceIds); // expand all filtered by default
    setExpandedRows([]);
  }, [agentUsage, hideAgentsWithoutUsage, search, groupBySpace]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value.toLowerCase());
  };

  const grouped = groupBySpace();

  // Helper to filter agents at render time
  const getVisibleAgents = (agents: (typeof grouped)[string]["agents"]) => {
    let agentArr = Object.values(agents);
    if (hideAgentsWithoutUsage) {
      agentArr = agentArr.filter(
        (a) =>
          a.usage &&
          a.usage.reduce(
            (sum, usage) =>
              sum + (usage.inputTokens || 0) + (usage.outputTokens || 0),
            0,
          ) > 0,
      );
    }
    if (search) {
      agentArr = agentArr.filter((a) =>
        a.agent.id.toLowerCase().includes(search.toLowerCase()),
      );
    }
    return agentArr;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1">
          <Search className="absolute w-4 h-4 left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            type="text"
            placeholder="Search Agent ..."
            className="w-full max-w-md pl-8"
            value={search}
            onChange={handleSearch}
            name="search"
          />
        </div>
        <div className="ml-auto flex justify-end items-center gap-2">
          <Checkbox
            label="Hide spaces/agents with no usage"
            checked={hideAgentsWithoutUsage}
            onCheckedChange={(checked) => setHideAgentsWithoutUsage(checked)}
          />
          <span className="text-xs text-muted-foreground">
            Hide spaces/agents with no usage
          </span>
        </div>
      </div>
      <Card className="px-0 py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Space / Agent</TableHead>
              <TableHead className="max-md:hidden">Type</TableHead>
              <TableHead className="max-md:hidden">Status/Model</TableHead>
              <TableHead className="truncate">Token Usage</TableHead>
              <TableHead>
                <div className="pr-2 ml-auto">Manage</div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSpaces.map((spaceId) => {
              const spaceGroup = grouped[spaceId];
              const agents = getVisibleAgents(spaceGroup.agents);
              return (
                <React.Fragment key={spaceId}>
                  <TableRow
                    onClick={() => {
                      setExpandedSpaces((prev) =>
                        prev.includes(spaceId)
                          ? prev.filter((id) => id !== spaceId)
                          : [...prev, spaceId],
                      );
                    }}
                    className={cn("h-15 cursor-pointer hover:bg-blue-100", {
                      "bg-blue-100": expandedSpaces.includes(spaceId),
                    })}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 h-full truncate">
                        <div className="aspect-square w-6 h-6 hidden xl:flex items-center justify-center">
                          {expandedSpaces.includes(spaceId) ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </div>
                        <div className="aspect-square w-8 h-8 rounded-md bg-white flex items-center justify-center">
                          <Home size={14} />
                        </div>
                        <span className="">{spaceGroup.space.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-md:hidden w-25">
                      <Badge reduced disabled>
                        Space
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-md:hidden w-30">
                      {agents.length} Agents
                    </TableCell>
                    <TableCell className=" w-60 xl:w-100">
                      {spaceGroup.totalTokens ? (
                        <TokenProgressBar
                          limit={500000}
                          used={spaceGroup.totalTokens}
                        />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          no usage yet
                        </span>
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
                  {agents.length > 0 &&
                    agents.map((agentGroup) => {
                      if (!expandedSpaces.includes(spaceId)) {
                        return null;
                      }
                      const agent = agentGroup.agent;
                      const agentUsageArr = agentGroup.usage;
                      const totalAgentTokens = agentUsageArr.reduce(
                        (sum, usage) =>
                          sum +
                          (usage.inputTokens || 0) +
                          (usage.outputTokens || 0),
                        0,
                      );
                      return (
                        <React.Fragment key={agent.id}>
                          <TableRow
                            className={cn("h-15 hover:bg-blue-50", {
                              "bg-blue-50 hover:bg-blue-50":
                                expandedRows.includes(agent.id),
                            })}
                            onClick={() => {
                              if (agentUsageArr && agentUsageArr.length > 0) {
                                setExpandedRows((prev) =>
                                  prev.includes(agent.id)
                                    ? prev.filter((id) => id !== agent.id)
                                    : [...prev, agent.id],
                                );
                              }
                            }}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2 ml-9">
                                <div className="aspect-square w-6 h-6 hidden xl:flex items-center justify-center">
                                  <ChevronRight size={14} />
                                </div>
                                <div className="aspect-square w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center max-md:hidden">
                                  <User size={14} />
                                </div>
                                <span className="">{agent.id}</span>
                                {agentUsageArr && agentUsageArr.length > 0 ? (
                                  expandedRows.includes(agent.id) ? (
                                    <ChevronUp size={14} />
                                  ) : (
                                    <ChevronDown size={14} />
                                  )
                                ) : undefined}
                              </div>
                            </TableCell>
                            <TableCell className="max-md:hidden">
                              <Badge variant="green" reduced disabled>
                                Agent
                              </Badge>
                            </TableCell>
                            <TableCell className="max-md:hidden">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Bubble isActive={agent.isActive} />
                                <span>
                                  {agent.isActive ? "Active" : "Inactive"}{" "}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {agentUsageArr.length === 0 ? (
                                <span className="text-muted-foreground text-xs">
                                  no usage yet
                                </span>
                              ) : (
                                <TokenProgressBar
                                  limit={500000}
                                  used={totalAgentTokens}
                                />
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
                          {agentUsageArr.map((usage) => (
                            <TableRow
                              key={`${agent.id}-${usage.modelId}`}
                              className={cn("h-15 bg-neutral-100", {
                                hidden: !expandedRows.includes(agent.id),
                              })}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2 ml-18">
                                  <div className="aspect-square w-6 h-6 hidden xl:flex items-center justify-center">
                                    <ChevronRight size={14} />
                                  </div>
                                  <div className="aspect-square w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center max-md:hidden">
                                    <Package size={14} />
                                  </div>
                                  <span className="text-xs">
                                    {usage.modelId}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="max-md:hidden">
                                <Badge variant="blue" reduced disabled>
                                  Model
                                </Badge>
                              </TableCell>
                              <TableCell className="max-md:hidden">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Bubble isActive={agent.isActive} />{" "}
                                  {usage.modelId || "n/a"}
                                </div>
                              </TableCell>
                              <TableCell>
                                {(usage.inputTokens || 0) +
                                (usage.outputTokens || 0) ? (
                                  <TokenProgressBar
                                    limit={50000}
                                    used={
                                      (usage.inputTokens || 0) +
                                      (usage.outputTokens || 0)
                                    }
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
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
};

export default CostControlTable;
