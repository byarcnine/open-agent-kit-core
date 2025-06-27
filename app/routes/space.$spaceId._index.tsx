import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useLoaderData,
  Link,
  useActionData,
  useNavigate,
  data,
} from "react-router";
import { prisma } from "@db/db.server";
import { MessageCircle, Search, Sliders } from "react-feather";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { z } from "zod";
import NoDataCard from "~/components/ui/no-data-card";
import CreateAgentDialog from "~/components/createAgentDialog/createAgentDialog";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  allowedAgentsToViewForUser,
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { SessionUser } from "~/types/auth";
import {
  AgentCard,
  AgentCardContent,
  AgentCardDescription,
  AgentCardHeader,
  AgentCardTitle,
} from "~/components/ui/agent-card";
import Bubble from "~/components/ui/bubble";

const CreateAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  slug: z
    .string()
    .min(3, "Agent slug is required and must be at least 3 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens",
    ),
  description: z.string().optional(),
});

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { spaceId } = params;
  await hasAccessHierarchical(
    request,
    PERMISSION["space.create_agent"],
    spaceId,
  );
  const formData = await request.formData();

  const validation = CreateAgentSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });

  if (!validation.success) {
    return {
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const { name, slug } = validation.data;

  try {
    const agent = await prisma.agent.create({
      data: {
        id: slug,
        name,
        description: validation.data.description || null,
        space: {
          connect: {
            id: spaceId,
          },
        },
      },
    });
    return redirect(`/space/${spaceId}/agent/${agent.id}`);
  } catch (error) {
    return {
      errors: {
        slug: ["Space with this slug already exists"],
      },
    };
  }
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { spaceId } = params;
  const user = await hasAccessHierarchical(request);
  const allowedAgents = await allowedAgentsToViewForUser(user);
  const spacePromise = await prisma.space.findUnique({
    where: {
      id: spaceId,
    },
  });
  const userScopes = await getUserScopes(user);

  const agentsPromise = await prisma.agent.findMany({
    where: {
      spaceId,
      id: {
        in: allowedAgents,
      },
    },
    include: {
      agentUsers: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
  const [agents, space] = await Promise.all([agentsPromise, spacePromise]);
  if (!space) {
    throw data({ error: "Space not found" }, { status: 404 });
  }
  const userCanCreateAgent = userScopes.some(
    (scope) =>
      scope.scope === "space.create_agent" && scope.referenceId === spaceId,
  );
  return {
    agents,
    space: space ?? null,
    user: user as SessionUser,
    userScopes,
    userCanCreateAgent,
  };
};

const Index = () => {
  const { agents, space, userScopes, userCanCreateAgent } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [search, setSearch] = useState("");
  const [agentViewType, setAgentViewType] = useState("grid");

  const handleTabChange = (value: string) => {
    sessionStorage.setItem("agentViewType", value);
    setAgentViewType(value);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const navigate = useNavigate();
  const handleTableRowClick = (agentId: string) => {
    if (agentId) {
      navigate(`/agent/${agentId}`);
    }
  };

  const filteredAgents = agents.filter((agent) => {
    return (
      agent.isActive &&
      (search ? agent.name.toLowerCase().includes(search.toLowerCase()) : true)
    );
  });

  useEffect(() => {
    const savedTab = sessionStorage.getItem("agentViewType");
    if (savedTab) {
      setAgentViewType(savedTab);
    } else {
      setAgentViewType("grid");
    }
  }, []);

  return (
    <>
      <div className="w-full flex flex-col h-full overflow-hidden pt-8 px-4 md:px-8">
        <div className="sticky top-0">
          <div className="flex flex-row flex-wrap items-center justify-between pb-4 gap-4">
            <h1 className="text-3xl font-medium">{space?.name} Agents</h1>
            {userCanCreateAgent && (
              <CreateAgentDialog errors={actionData?.errors} />
            )}
          </div>
          <div className="flex flex-row items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute w-4 h-4 left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                type="text"
                placeholder="Search Agents ..."
                className="w-full max-w-md pl-8"
                value={search}
                onChange={handleSearch}
                name="search"
              />
            </div>
            <div className="flex gap-1 ml-auto">
              <Tabs
                defaultValue={agentViewType}
                value={agentViewType}
                onValueChange={handleTabChange}
                className="w-full max-w-md"
              >
                <TabsList>
                  <TabsTrigger reduced value="grid">
                    Grid
                  </TabsTrigger>
                  <TabsTrigger reduced value="list">
                    List
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div className="border-t mt-4 mb-8" />
        </div>
        <div className="flex-1 flex flex-col pb-8 overflow-auto scrollbar-none">
          {filteredAgents && filteredAgents.length === 0 ? (
            <NoDataCard
              className="my-auto"
              headline={search ? "No agents found" : "No agents created"}
              description={
                search
                  ? "Try a different search term"
                  : "Create your first agent!"
              }
            >
              <CreateAgentDialog errors={actionData?.errors} />
            </NoDataCard>
          ) : (
            <>
              {agentViewType === "grid" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {filteredAgents &&
                    filteredAgents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        className="justify-between flex flex-col"
                      >
                        <AgentCardHeader className="flex flex-col">
                          <div className="flex-1 flex justify-between items-center gap-2">
                            <AgentCardTitle className="truncate">
                              {agent.name}
                            </AgentCardTitle>
                            <Bubble isActive={agent.isActive} />
                          </div>
                          <AgentCardDescription className="flex gap-1 items-center">
                            {agent.description || "No description"}
                            {/* {agent.activeUserCount && (
                              <div className="ml-auto text-xs text-primary flex items-center rounded-lg  bg-neutral-200 py-1 px-2">
                                <Users className="h-3 w-3 inline mr-1" />
                                {agent.activeUserCount}
                              </div>
                            )} */}
                          </AgentCardDescription>
                        </AgentCardHeader>
                        <AgentCardContent>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              className="block flex-1"
                              to={`/chat/${agent.id}`}
                            >
                              <Button variant="default" className="w-full">
                                <MessageCircle className="h-4 w-4" />
                                Chat
                              </Button>
                            </Link>

                            {userScopes.some(
                              (scope) =>
                                scope.scope === "agent.edit_agent" &&
                                scope.referenceId === agent.id,
                            ) && (
                              <Link
                                className="flex-1"
                                to={`/space/${space.id}/agent/${agent.id}`}
                              >
                                <Button variant="outline" className="w-full">
                                  <Sliders className="h-4 w-4" />
                                  Manage
                                </Button>
                              </Link>
                            )}
                          </div>
                        </AgentCardContent>
                      </AgentCard>
                    ))}
                </div>
              )}
              {agentViewType === "list" &&
              filteredAgents &&
              filteredAgents.length > 0 ? (
                <div className="">
                  <div className="border shadow-xs rounded-2xl overflow-hidden">
                    <Table className="w-full bg-white">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent Name</TableHead>
                          <TableHead className="max-md:hidden">
                            Description
                          </TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAgents.map((agent) => (
                          <TableRow
                            onClick={() => handleTableRowClick(agent.id)}
                            className="cursor-pointer"
                            key={agent.id}
                          >
                            <TableCell>{agent.name}</TableCell>
                            <TableCell className="max-md:hidden">
                              {agent.description || "No description"}
                            </TableCell>

                            <TableCell className="flex flex-row gap-2">
                              <Link to={`/chat/${agent.id}`}>
                                <Button variant="default" size="sm">
                                  Chat
                                </Button>
                              </Link>
                              {userScopes.some(
                                (scope) =>
                                  scope.scope === "agent.edit_agent" &&
                                  scope.referenceId === agent.id,
                              ) && (
                                <Link
                                  to={`/space/${space.id}/agent/${agent.id}`}
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-2"
                                  >
                                    Manage
                                  </Button>
                                </Link>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Index;

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: `OAK Dashboard` },
    { name: "description", content: "Open Agent Kit Dashboard" },
  ];
};
