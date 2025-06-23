import React from "react";
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
  User,
} from "react-feather";
import { Badge } from "../ui/badge";
import TokenProgressBar from "../ui/tokenProgressBar";
import { Button } from "../ui/button";
import Bubble from "../ui/bubble";
import type { SpaceWithAgents } from "~/types/costControl";
import { cn } from "~/lib/utils";

interface CostControlTableProps {
  usage: SpaceWithAgents[];
}

const CostControlTable: React.FC<CostControlTableProps> = ({ usage }) => {
  const [expandedSpaces, setExpandedSpaces] = React.useState<string[]>([]);
  const [expandedRows, setExpandedRows] = React.useState<string[]>([]);

  return (
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
          <React.Fragment key={space.id}>
            <TableRow
              onClick={() => {
                setExpandedSpaces((prev) =>
                  prev.includes(space.id)
                    ? prev.filter((id) => id !== space.id)
                    : [...prev, space.id],
                );
              }}
              className="bg-blue-100 h-15"
            >
              <TableCell>
                <div className="flex items-center gap-2 h-full truncate">
                  <ChevronDown size={14} className="cursor-pointer" />
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
                  <TokenProgressBar limit={500000} used={space.totalTokens} />
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
              space.allowedAgents.map((agent) => {
                if (!expandedSpaces.includes(space.id)) {
                  return null; // Skip rendering if the space is not expanded
                }
                return (
                  <>
                    <TableRow key={agent.id} className="h-15">
                      <TableCell
                        onClick={() => {
                          setExpandedRows((prev) =>
                            prev.includes(agent.id)
                              ? prev.filter((id) => id !== agent.id)
                              : [...prev, agent.id],
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {agent.usage && agent.usage.length > 0 ? (
                            expandedRows.includes(agent.id) ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )
                          ) : (
                            <ChevronRight size={14} />
                          )}
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
                          <Bubble isActive={agent.isActive} />
                          <span>{agent.isActive ? "Active" : "Inactive"} </span>
                        </div>
                      </TableCell>
                      <TableCell></TableCell>
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
                        className={cn("h-15 bg-zinc-100/50", {
                          hidden: !expandedRows.includes(agent.id),
                        })}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2 ml-8">
                            <ChevronRight size={14} />

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
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );
};

export default CostControlTable;
