import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useLoaderData,
  Link,
  Form,
  useActionData,
} from "react-router";
import { prisma } from "@db/db.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { hasAccess, hasPermission } from "~/lib/auth/hasAccess.server";
import { MessageSquare, Plus, Settings } from "react-feather";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { z } from "zod";
import Layout from "~/components/layout/layout";
import { Textarea } from "~/components/ui/textarea";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import { PERMISSIONS, type SessionUser } from "~/types/auth";
import NoDataCard from "~/components/ui/no-data-card";
import CreateAgentDialog from "~/components/createAgentDialog/createAgentDialog";

const CreateAgentSchema = z.object({
  name: z.string().min(1, "Agent name is required"),
  slug: z
    .string()
    .min(3, "Agent slug is required and must be at least 3 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
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

  return (
    <Layout navComponent={<OverviewNav user={user} />} user={user}>
      <div className="w-full py-8 px-4 md:p-8 flex flex-col h-full">
        <div className="flex flex-row flex-wrap items-center justify-between pb-8 gap-4">
          <h1 className="text-3xl font-bold">My Agents</h1>
          {canEditAllAgents && (
            <CreateAgentDialog errors={actionData?.errors} />
          )}
        </div>
        <div className="flex-1 flex flex-col">
          {agents && agents.length === 0 ? (
            <NoDataCard
              className="my-auto"
              headline="No Agents found"
              description="Start and create your first agent!"
            >
              {canEditAllAgents && (
                <CreateAgentDialog errors={actionData?.errors} />
              )}
            </NoDataCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xxl:grid-cols-4 gap-4">
              {agents &&
                agents.map((agent) => (
                  <Card
                    key={agent.id}
                    className="justify-between flex flex-col"
                  >
                    <CardHeader className="flex flex-col">
                      <CardTitle>{agent.name}</CardTitle>

                      <p className="text-sm text-muted-foreground">
                        {agent.description || "No description"}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="block w-full flex-1"
                          to={`/chat/${agent.id}`}
                        >
                          <Button variant="default" className="w-full">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat
                          </Button>
                        </Link>
                        {userCanEdit(agent) && (
                          <Link className="flex-1" to={`/agent/${agent.id}`}>
                            <Button variant="outline" className="w-full">
                              <Settings className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </Link>
                        )}
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
