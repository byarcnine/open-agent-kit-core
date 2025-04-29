import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useLoaderData,
  Link,
  useActionData,
} from "react-router";
import { prisma } from "@db/db.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { hasAccess, hasPermission } from "~/lib/auth/hasAccess.server";
import { MessageCircle, Settings } from "react-feather";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { z } from "zod";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import { PERMISSIONS, type SessionUser } from "~/types/auth";
import NoDataCard from "~/components/ui/no-data-card";
import CreateAgentDialog from "~/components/createAgentDialog/createAgentDialog";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";

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

export const action = async ({ request }: ActionFunctionArgs) => {
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

  const agent = await prisma.agent.create({
    data: {
      id: slug,
      name,
      description: validation.data.description || null,
      agentUsers: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
      systemPrompts: {
        create: {
          key: "default",
          prompt: "You are a helpful assistant.",
        },
      },
    },
  });

  return redirect(`/agent/${agent.id}`);
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccess(request, PERMISSIONS.ACCESS_OAK);
  const canEditAllAgents = await hasPermission(user, PERMISSIONS.EDIT_AGENT);
  const canViewAllAgents = await hasPermission(user, PERMISSIONS.VIEW_AGENT);
  const agents = await prisma.agent.findMany({
    where: canViewAllAgents
      ? undefined
      : {
          agentUsers: {
            some: {
              userId: user.id,
            },
          },
        },
    include: {
      agentUsers: {
        where: {
          userId: user.id,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
  return {
    agents,
    user: user as SessionUser,
    canEditAllAgents,
  };
};

const Index = () => {
  const { agents, user, canEditAllAgents } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const userCanEdit = (agent: (typeof agents)[0]) =>
    canEditAllAgents ||
    agent.agentUsers[0]?.role === "OWNER" ||
    agent.agentUsers[0]?.role === "EDITOR";

  const [search, setSearch] = useState("");
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const filteredAgents = search
    ? agents.filter((agent) =>
        agent.name.toLowerCase().includes(search.toLowerCase()),
      )
    : agents;

  return (
    <Layout navComponent={<OverviewNav user={user} />} user={user}>
      <div className="w-full py-8 px-4 md:p-8 flex flex-col h-full">
        <div className="flex flex-row flex-wrap items-center justify-between pb-4 gap-4">
          <h1 className="text-3xl font-medium">My Agents</h1>
          {canEditAllAgents && (
            <CreateAgentDialog errors={actionData?.errors} />
          )}
        </div>
        <div>
          <Input
            autoFocus
            type="text"
            placeholder="Find agents..."
            className="w-full max-w-sm"
            value={search}
            onChange={handleSearch}
            name="search"
          />
        </div>
        <div className="border-t mt-4 mb-8" />
        <div className="flex-1 flex flex-col pb-8">
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
              {canEditAllAgents && !search && (
                <CreateAgentDialog errors={actionData?.errors} />
              )}
            </NoDataCard>
          ) : (
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
                      <div className="ml-auto">
                        {userCanEdit(agent) && (
                          <Link className="flex-1" to={`/agent/${agent.id}`}>
                            <Badge variant="outline">
                              <Settings className="h-4 w-4" />
                            </Badge>
                          </Link>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Link className="block " to={`/chat/${agent.id}`}>
                          <Button variant="default" className="w-full">
                            <MessageCircle className="h-4 w-4" />
                            Chat
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
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
