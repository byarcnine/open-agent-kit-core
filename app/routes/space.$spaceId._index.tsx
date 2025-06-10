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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { hasAccess, hasPermission } from "~/lib/auth/hasAccess.server";
import { MessageCircle, Search, Sliders, Users } from "react-feather";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { z } from "zod";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import { PERMISSIONS, type SessionUser } from "~/types/auth";
import NoDataCard from "~/components/ui/no-data-card";
import CreateAgentDialog from "~/components/createAgentDialog/createAgentDialog";
import { useEffect, useState, useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

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
  const user = await hasAccess(request, PERMISSIONS.VIEW_AGENT);
  const canCreateAgent = user.role === "SUPER_ADMIN";
  if (!canCreateAgent) {
    return {
      errors: {
        slug: ["You are not authorized to create agents"],
      },
    };
  }
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
  const user = await hasAccess(request, PERMISSIONS.ACCESS_OAK);
  const { spaceId } = params;
  const canEditAllAgents = await hasPermission(user, PERMISSIONS.EDIT_AGENT);
  const canViewAllAgents = await hasPermission(user, PERMISSIONS.VIEW_AGENT);
  const globalUserCount = await prisma.user.count({
    where: {
      role: {
        in: ["SUPER_ADMIN", "EDIT_ALL_AGENTS", "VIEW_ALL_AGENTS"],
      },
    },
  });
  const spacePromise = await prisma.space.findUnique({
    where: {
      id: spaceId,
    },
  });
  const agentsPromise = (
    await prisma.agent.findMany({
      where: {
        spaceId,
      },
      include: {
        agentUsers: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            agentUsers: {
              where: {
                user: {
                  role: {
                    notIn: [
                      "SUPER_ADMIN",
                      "EDIT_ALL_AGENTS",
                      "VIEW_ALL_AGENTS",
                    ],
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })
  ).map((agent) => ({
    ...agent,
    activeUserCount: agent._count.agentUsers + globalUserCount,
  }));
  const [agents, space] = await Promise.all([agentsPromise, spacePromise]);
  if (!space) {
    throw data({ error: "Space not found" }, { status: 404 });
  }
  return {
    agents,
    space: space ?? null,
    user: user as SessionUser,
  };
};

const Index = () => {
  const { agents, user, space } = useLoaderData<typeof loader>();
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

  // Filter agents based on search input
  const filteredAgents = search
    ? agents.filter((agent) =>
        agent.name.toLowerCase().includes(search.toLowerCase()),
      )
    : agents;

  useEffect(() => {
    const savedTab = sessionStorage.getItem("agentViewType");
    if (savedTab) {
      setAgentViewType(savedTab);
    } else {
      setAgentViewType("grid");
    }
  }, []);

  return (
    <Layout navComponent={<OverviewNav user={user} />} user={user}>
      <div className="w-full flex flex-col h-full overflow-hidden pt-8 px-4 md:px-8">
        <div className="sticky top-0">
          <div className="flex flex-row flex-wrap items-center justify-between pb-4 gap-4">
            <h1 className="text-3xl font-medium">{space?.name} Agents</h1>
            <CreateAgentDialog errors={actionData?.errors} />
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
                  <TabsTrigger value="grid">Grid</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
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
                      <Card
                        key={agent.id}
                        className="justify-between flex flex-col"
                      >
                        <CardHeader className="flex flex-row justify-between">
                          <div className="flex-1">
                            <CardTitle>{agent.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-2">
                              {agent.description || "No description"}
                            </p>
                          </div>
                          {agent.activeUserCount && (
                            <div className="ml-auto">
                              <div className="ml-2 text-sm text-muted-foreground flex items-center">
                                <Users className="h-4 w-4 inline mr-1" />
                                {agent.activeUserCount}
                              </div>
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
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

                            {/* {userCanEdit(agent) && ( */}
                            {agent && (
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
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
              {agentViewType === "list" &&
              filteredAgents &&
              filteredAgents.length > 0 ? (
                <div className="">
                  <div className="border shadow-xs rounded-md overflow-hidden">
                    <Table className="w-full bg-sky-100/30">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent Name</TableHead>
                          <TableHead className="max-md:hidden">
                            Description
                          </TableHead>
                          <TableHead className="w-40">Actions</TableHead>
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

                            <TableCell>
                              <Link to={`/chat/${agent.id}`}>
                                <Button variant="default" size="sm">
                                  Chat
                                </Button>
                              </Link>
                              {/* {userCanEdit(agent) && (
                                <Link to={`/agent/${agent.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-2"
                                  >
                                    Manage
                                  </Button>
                                </Link>
                              )} */}
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
    </Layout>
  );
};

export default Index;

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: `OAK Dashboard` },
    { name: "description", content: "Open Agent Kit Dashboard" },
  ];
};
