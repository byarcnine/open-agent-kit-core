import { Outlet, useLoaderData, useParams } from "react-router";
import Layout from "~/components/layout/layout";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { prisma } from "@db/db.server";
import { AdminNav } from "~/components/adminNav/adminNav";
import { getAgentPluginMenuItems } from "~/lib/plugins/availability.server";
import { PERMISSIONS } from "~/types/auth";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const user = await hasAccess(request, PERMISSIONS.EDIT_AGENT, agentId);
  const [agent, pluginMenuItems] = await Promise.all([
    prisma.agent.findUnique({
      where: { id: agentId },
    }),
    getAgentPluginMenuItems(agentId),
  ]);
  if (!agent) {
    throw new Response("Agent not found", { status: 404 });
  }
  return { user, agent, pluginMenuItems };
};

const Agent = () => {
  const loaderData = useLoaderData<typeof loader>();
  const { user, agent, pluginMenuItems } = loaderData;
  const { spaceId } = useParams();
  return (
    <Layout
      navComponent={<AdminNav pluginMenuItems={pluginMenuItems} />}
      user={user}
      agentName={agent.name}
      spaceId={spaceId}
    >
      <Outlet />
    </Layout>
  );
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `OAK - ${data?.agent.name}` },
    { name: "description", content: "Open Agent Kit" },
  ];
};

export default Agent;
