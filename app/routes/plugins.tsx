import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  useLoaderData,
  useFetcher,
} from "react-router";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import {
  getPluginsWithAvailability,
  setPluginAvailability,
} from "~/lib/plugins/availability.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useState } from "react";
import { Settings } from "react-feather";
import { prisma } from "@db/db.server";
import AgentAvailabilitySelector from "~/components/agentAvailabilitySelector/agentAvailabilitySelector";
import { toast, Toaster } from "sonner";
import type { PluginWithAvailability } from "~/types/plugins";
import { Badge } from "~/components/ui/badge";
import { PERMISSIONS, type SessionUser } from "~/types/auth";
import NoDataCard from "~/components/ui/no-data-card";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccess(request, PERMISSIONS.EDIT_GLOBAL_SETTINGS);
  const agentsPromise = prisma.agent.findMany({ orderBy: { name: "asc" } });
  const pluginsWithAvailabilityPromise = getPluginsWithAvailability();
  const [agents, plugins] = await Promise.all([
    agentsPromise,
    pluginsWithAvailabilityPromise,
  ]);
  return { agents, plugins, user: user as SessionUser };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await hasAccess(request, PERMISSIONS.EDIT_GLOBAL_SETTINGS);

  const formData = await request.formData();
  const pluginIdentifier = formData.get("pluginIdentifier") as string;
  const isGlobal = formData.get("isGlobal") === "true";
  const agentIds = JSON.parse(formData.get("agentIds") as string);

  await setPluginAvailability(pluginIdentifier, isGlobal, agentIds);
  return { success: true };
};

export default function Plugins() {
  const { plugins, user, agents } = useLoaderData<typeof loader>();
  const [selectedPluginIdentifier, setSelectedPluginIdentifier] = useState<
    string | null
  >(null);
  const fetcher = useFetcher();

  const onSetAvailability = async (isGlobal: boolean, agentIds: string[]) => {
    if (!selectedPluginIdentifier) return;
    fetcher.submit(
      {
        pluginIdentifier: selectedPluginIdentifier,
        isGlobal: isGlobal.toString(),
        agentIds: JSON.stringify(agentIds),
      },
      { method: "POST" },
    );
    toast.success(
      `Successfully updated ${selectedPluginIdentifier} availability`,
    );
  };

  return (
    <Layout navComponent={<OverviewNav user={user} />}>
      <div className="w-full py-8 px-4 md:p-8 flex flex-col">
        <div className="flex flex-row items-center justify-between pb-8">
          <h1 className="text-3xl font-medium">Tools & Plugins</h1>
        </div>
        <div className="flex flex-col flex-1">
          {!plugins || plugins.length === 0 ? (
            <NoDataCard
              headline="No plugins found"
              description="There are no plugins available for your agents."
              className="my-auto"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xxl:grid-cols-4 gap-4">
              {plugins.map((plugin) => (
                <Card key={plugin.name} className="flex flex-col">
                  <CardHeader className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <CardTitle>{plugin.displayName}</CardTitle>
                      <button
                        onClick={() => setSelectedPluginIdentifier(plugin.name)}
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                    {plugin.description && (
                      <div className="text-sm text-muted-foreground mb-4">
                        {plugin.description}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col">
                      {plugin.isGlobal && (
                        <Badge
                          className="mb-2 justify-center mr-auto"
                          variant="outline"
                        >
                          Available for all agents
                        </Badge>
                      )}
                      {!plugin.isGlobal && plugin.agents && (
                        <h3 className="text-xs mb-2 text-muted-foreground font-medium">
                          Available for Agents:
                        </h3>
                      )}
                      {!plugin.isGlobal && (
                        <div className="text-sm text-muted-foreground flex flex-wrap gap-2 max-w-full">
                          {plugin.agents.map((agent) => (
                            <div key={agent.id}>
                              <Badge variant="outline">{agent.name}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <AgentAvailabilitySelector
          agents={agents}
          selectedPlugin={
            plugins.find(
              (t: PluginWithAvailability) =>
                t.name === selectedPluginIdentifier,
            ) || null
          }
          key={selectedPluginIdentifier}
          setSelectedPluginIdentifier={setSelectedPluginIdentifier}
          onSetAvailability={onSetAvailability}
        />
      </div>
      <Toaster />
    </Layout>
  );
}
