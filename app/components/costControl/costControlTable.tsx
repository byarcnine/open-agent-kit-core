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
import type { SpaceWithAgents } from "~/types/costControl";
import { cn } from "~/lib/utils";
import Checkbox from "../ui/checkbox";
import { Card } from "../ui/card";
import { Input } from "../ui/input";

interface CostControlTableProps {
  usage: SpaceWithAgents[];
}

const CostControlTable: React.FC<CostControlTableProps> = ({ usage }) => {
  const [expandedSpaces, setExpandedSpaces] = React.useState<string[]>([]);
  const [expandedRows, setExpandedRows] = React.useState<string[]>([]);
  const [data, setData] = useState<SpaceWithAgents[]>(usage);
  const [hideAgentsWithoutUsage, setHideAgentsWithoutUsage] =
    useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);
  };

  const handleFiltering = () => {
    let filteredData = usage;

    if (hideAgentsWithoutUsage) {
      filteredData = filteredData
        .map((space) => ({
          ...space,
          allowedAgents: space.allowedAgents.filter(
            (agent) => agent.usage && agent.usage.length > 0,
          ),
        }))
        .filter((space) => space.allowedAgents.length > 0);
    }

    if (search) {
      filteredData = filteredData
        .map((space) => ({
          ...space,
          allowedAgents: space.allowedAgents.filter((agent) =>
            agent.id.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter(
          (space) =>
            space.name.toLowerCase().includes(search.toLowerCase()) ||
            space.allowedAgents.length > 0,
        );
    }

    setData(filteredData);

    const expandedSpaceIds = filteredData.map((space) => space.id);
    setExpandedSpaces(expandedSpaceIds);
    setExpandedRows([]);
  };

  useEffect(() => {
    setData(usage);
  }, [usage]);

  useEffect(() => {
    handleFiltering();
  }, [hideAgentsWithoutUsage, usage, search]);

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
            {data.map((space) => (
              <React.Fragment key={space.id}>
                <TableRow
                  onClick={() => {
                    setExpandedSpaces((prev) =>
                      prev.includes(space.id)
                        ? prev.filter((id) => id !== space.id)
                        : [...prev, space.id],
                    );
                  }}
                  className={cn("h-15 cursor-pointer hover:bg-blue-100", {
                    "bg-blue-100": expandedSpaces.includes(space.id),
                  })}
                >
                  <TableCell>
                    <div className="flex items-center gap-2 h-full truncate">
                      <div className="aspect-square w-6 h-6 hidden xl:flex items-center justify-center">
                        {expandedSpaces.includes(space.id) ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </div>

                      <div className="aspect-square w-8 h-8 rounded-md bg-white flex items-center justify-center">
                        <Home size={14} />
                      </div>
                      <span className="">{space.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-md:hidden w-25">
                    <Badge reduced disabled>
                      Space
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-md:hidden w-30">
                    {space.allowedAgents.length} Agents
                  </TableCell>
                  <TableCell className=" w-60 xl:w-100">
                    {space.totalTokens ? (
                      <TokenProgressBar
                        limit={500000}
                        used={space.totalTokens}
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
                {space?.allowedAgents?.length > 0 &&
                  space.allowedAgents.map((agent) => {
                    if (!expandedSpaces.includes(space.id)) {
                      return null;
                    }
                    return (
                      <>
                        <TableRow
                          key={agent.id}
                          className={cn("h-15 hover:bg-blue-50", {
                            "bg-blue-50 hover:bg-blue-50":
                              expandedRows.includes(agent.id),
                          })}
                        >
                          <TableCell
                            onClick={() => {
                              if (agent.usage && agent.usage.length > 0) {
                                setExpandedRows((prev) =>
                                  prev.includes(agent.id)
                                    ? prev.filter((id) => id !== agent.id)
                                    : [...prev, agent.id],
                                );
                              }
                            }}
                          >
                            <div className="flex items-center gap-2 ml-9">
                              <div className="aspect-square w-6 h-6 hidden xl:flex items-center justify-center">
                                <ChevronRight size={14} />
                              </div>
                              <div className="aspect-square w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center max-md:hidden">
                                <User size={14} />
                              </div>
                              <span className="">{agent.id}</span>
                              {agent.usage && agent.usage.length > 0 ? (
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
                            {agent.usage?.length === 0 ? (
                              <span className="text-muted-foreground text-xs">
                                no usage yet
                              </span>
                            ) : (
                              <TokenProgressBar
                                limit={500000}
                                used={
                                  agent.usage?.reduce(
                                    (sum, usage) =>
                                      sum + (usage.totalTokens || 0),
                                    0,
                                  ) || 0
                                }
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
                        {agent.usage?.map((usage) => (
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
                                <span className="text-xs">{usage.modelId}</span>
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
                              {usage.totalTokens ? (
                                <TokenProgressBar
                                  limit={50000}
                                  used={usage.totalTokens}
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
                    );
                  })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
};

export default CostControlTable;
