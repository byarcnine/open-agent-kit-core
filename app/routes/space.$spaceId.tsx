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
  Outlet,
} from "react-router";
import { prisma } from "@db/db.server";
import { MessageCircle, Search, Sliders, Users } from "react-feather";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { z } from "zod";
import Layout from "~/components/layout/layout";
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
import { SpaceDetailNav } from "~/components/spaceDetailNav/spaceDetailNav";
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
  const spacePromise = prisma.space.findUnique({
    where: {
      id: spaceId,
    },
  });
  const userScopesPromise = getUserScopes(user);
  const allowedAgents = await allowedAgentsToViewForUser(user);

  const agentsPromise = prisma.agent.findMany({
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
  const [agents, space, userScopes] = await Promise.all([
    agentsPromise,
    spacePromise,
    userScopesPromise,
  ]);
  if (!space) {
    throw data({ error: "Space not found" }, { status: 404 });
  }
  return {
    agents,
    space: space ?? null,
    user: user as SessionUser,
    userScopes,
  };
};

const Index = () => {
  const { space, user, userScopes } = useLoaderData<typeof loader>();

  return (
    <Layout
      navComponent={<SpaceDetailNav space={space} userScopes={userScopes} />}
      user={user}
    >
      <Outlet />
    </Layout>
  );
};

export default Index;

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `${data?.space?.name} - OAK Dashboard` },
    {
      name: "description",
      content: `${data?.space?.name} Space Dashboard`,
    },
  ];
};
