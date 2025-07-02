import { Suspense, useState } from "react";
import { prisma } from "@db/db.server";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
import { Card } from "~/components/ui/card";
import TokenProgressBar from "../components/ui/tokenProgressBar";
import FeatherIcon from "../components/featherIcon/featherIcon";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
import {
  Await,
  data,
  Form,
  useLoaderData,
  useActionData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { getUsageForType } from "~/lib/llm/usage.server";
import type { Limits } from "~/types/llm";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const type = formData.get("type");
    const entityId = formData.get("entityId");

    if (!type || !entityId) {
      return data({ error: "Invalid delete data" }, { status: 400 });
    }

    const activeLimits = await prisma.globalConfig.findFirst({
      where: {
        key: "activeLimits",
      },
    });

    const currentLimits = (activeLimits?.value || {
      activeLimits: [],
    }) as Limits;
    const filteredLimits = currentLimits.activeLimits.filter(
      (limit) => !(limit.type === type && limit.entityId === entityId),
    );

    const newLimits = {
      activeLimits: filteredLimits,
    } satisfies Limits;

    await prisma.globalConfig.upsert({
      where: {
        key: "activeLimits",
      },
      create: {
        key: "activeLimits",
        value: newLimits,
      },
      update: {
        value: newLimits,
      },
    });

    return data({ success: "Limit deleted" }, { status: 200 });
  }

  // Original add logic
  const type = formData.get("type");
  const entityId = formData.get("entity");
  const limit = formData.get("limit");
  if (!type || !entityId || !limit) {
    return data({ error: "Invalid form data" }, { status: 400 });
  }
  const limitNumber = Math.round(Number(limit) * 1_000_000);
  const activeLimits = await prisma.globalConfig.findFirst({
    where: {
      key: "activeLimits",
    },
  });
  const currentLimits = (activeLimits?.value || { activeLimits: [] }) as Limits;
  currentLimits.activeLimits.push({
    type: type as "space" | "agent" | "user",
    entityId: entityId as string,
    limit: limitNumber,
  });
  const newLimits = {
    activeLimits: currentLimits.activeLimits,
  } satisfies Limits;
  await prisma.globalConfig.upsert({
    where: {
      key: "activeLimits",
    },
    create: {
      key: "activeLimits",
      value: newLimits,
    },
    update: {
      value: newLimits,
    },
  });
  return data({ success: "Limit added" }, { status: 200 });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(request, "global.super_admin");
  const activeLimits = await prisma.globalConfig
    .findFirst({
      where: {
        key: "activeLimits",
      },
    })
    .then(async (config) => {
      const limits = (config?.value as Limits | null) || { activeLimits: [] };
      return Promise.all(
        limits.activeLimits.map(async (limit) => {
          if (limit.type === "space") {
            const space = await prisma.space.findUnique({
              where: {
                id: limit.entityId,
              },
            });
            return {
              ...limit,
              entity: { name: space?.name },
            };
          }
          if (limit.type === "agent") {
            const agent = await prisma.agent.findUnique({
              where: {
                id: limit.entityId,
              },
            });
            return {
              ...limit,
              entity: { name: agent?.name },
            };
          }
          if (limit.type === "user") {
            const user = await prisma.user.findUnique({
              where: {
                id: limit.entityId,
              },
            });
            return {
              ...limit,
              entity: { name: user?.name },
            };
          }
          return limit;
        }),
      );
    })
    .then((active) => {
      return active.map((limit) => ({
        ...limit,
        usage: getUsageForType(limit.type, limit.entityId, 30).then(
          (usage) =>
            Number(usage._sum.inputTokens) + Number(usage._sum.outputTokens),
        ),
      }));
    });

  const spaces = await prisma.space
    .findMany({
      orderBy: {
        name: "asc",
      },
    })
    .then((spaces) => {
      return spaces.map((space) => ({
        id: space.id,
        name: space.name,
      }));
    });

  const agents = await prisma.agent
    .findMany({
      orderBy: {
        name: "asc",
      },
    })
    .then((agents) => {
      return agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
      }));
    });
  const users = await prisma.user
    .findMany({
      orderBy: {
        name: "asc",
      },
    })
    .then((users) => {
      return users.map((user) => ({
        id: user.id,
        name: user.name,
      }));
    });

  return { user, spaces, agents, users, limits: activeLimits };
};

const CostControl = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [type, setType] = useState("space");
  const [entityId, setEntityId] = useState("");
  const [limit, setLimit] = useState("");
  const { spaces, agents, users, limits } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const getEntities = () => {
    if (type === "space") return spaces;
    if (type === "agent") return agents;
    if (type === "user") return users;
    return [];
  };

  // Close dialog on successful submission
  if (actionData && "success" in actionData) {
    if (dialogOpen) {
      setDialogOpen(false);
      setEntityId("");
      setLimit("");
      setType("space");
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-10 w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">Cost Control</h1>
          <p className="text-sm text-muted-foreground">
            Set a token limit for a space, agent, or user. <br />
            Token limits are always a floating window for a 30 day period.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default">Add Token Limit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Token Limit</DialogTitle>
              <DialogDescription>
                Set a token limit for a space, agent, or user. <br />
                Token limits are always a floating window for a 30 day period.
              </DialogDescription>
            </DialogHeader>
            <Form method="post" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={type} onValueChange={setType} name="type">
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="space">Space</SelectItem>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="entity">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Label>
                  <Select
                    value={entityId}
                    onValueChange={setEntityId}
                    name="entity"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${type}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {getEntities().map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="limit">Token Limit (Million Tokens)</Label>
                  <Input
                    id="limit"
                    name="limit"
                    type="number"
                    min={0.00001}
                    step={0.01}
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="e.g. 1 for 1,000,000 tokens"
                    required
                  />
                  <div className="text-xs text-muted-foreground mt-1 mb-2">
                    Enter the limit in millions of tokens. E.g. 0.1 = 100,000
                    tokens, 1 = 1,000,000 tokens, 5 = 5,000,000 tokens, 10 =
                    10,000,000 tokens
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[0.1, 1, 5, 10].map((val) => (
                      <Button
                        key={val}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLimit(val.toString())}
                      >
                        {val}M
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              {actionData && "error" in actionData && (
                <div className="text-sm text-red-500">{actionData.error}</div>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={!entityId || !limit}>
                  Add Limit
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      {actionData && "success" in actionData && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{actionData.success}</p>
        </div>
      )}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Token Limit</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {limits.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-4 text-center text-muted-foreground"
                >
                  No active limits.
                </TableCell>
              </TableRow>
            ) : (
              limits.map((l) => {
                return (
                  <TableRow key={l.entityId + l.type}>
                    <TableCell className="capitalize">{l.type}</TableCell>
                    <TableCell>{l.entity?.name || l.entityId}</TableCell>
                    <TableCell>
                      <Suspense fallback={<div>Loading...</div>}>
                        <Await resolve={l.usage}>
                          {(usage) => (
                            <TokenProgressBar used={usage} limit={l.limit} />
                          )}
                        </Await>
                      </Suspense>
                    </TableCell>
                    <TableCell>
                      <Form method="post" className="inline">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="type" value={l.type} />
                        <input
                          type="hidden"
                          name="entityId"
                          value={l.entityId}
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            if (
                              !confirm(
                                `Are you sure you want to delete the token limit for ${l.entity?.name || l.entityId}?`,
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <FeatherIcon iconName="Trash2" className="h-4 w-4" />
                        </Button>
                      </Form>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default CostControl;
