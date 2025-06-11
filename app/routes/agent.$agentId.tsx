import { Outlet, useLoaderData, useParams } from "react-router";
import Layout from "~/components/layout/layout";
import { type LoaderFunctionArgs, type MetaFunction } from "react-router";
import { prisma } from "@db/db.server";
import { AdminNav } from "~/components/adminNav/adminNav";
import { getAgentPluginMenuItems } from "~/lib/plugins/availability.server";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["agent.view_agent_settings"],
    params.agentId,
  );
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
      navComponent={
        <AdminNav
          spaceId={spaceId as string}
          pluginMenuItems={pluginMenuItems}
        />
      }
      user={user}
      agentName={agent.name}
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
