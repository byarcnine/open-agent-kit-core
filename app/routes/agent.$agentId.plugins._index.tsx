import {
  Link,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
} from "react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getPluginsForAgent } from "~/lib/plugins/availability.server";
import NoDataCard from "~/components/ui/no-data-card";

// Add this line near the top of the file
dayjs.extend(relativeTime);

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const plugins = await getPluginsForAgent(params.agentId as string);
  return { plugins };
};

const KnowledgeProvider = () => {
  const { plugins } = useLoaderData<typeof loader>();
  const { agentId } = useParams();

  return (
    <div className="w-full py-8 px-4 md:p-8">
      <h1 className="text-3xl font-medium mb-4">Plugins</h1>
      <div className="text-muted-foreground mb-6 max-w-lg">
        Plugins are used to extend the capabilities of the agent.
        <br />
        Plugins can be used to add new features, integrations, or custom logic
        to the agent.
      </div>

      {(!plugins || plugins.length === 0) && (
        <NoDataCard
          headline=""
          description="No plugins found for this agent."
        />
      )}
      {plugins && plugins.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xxl:grid-cols-4 gap-4 w-full">
          {plugins.map((plugin) => (
            <Link
              key={plugin.name}
              className="block"
              to={`/agent/${agentId}/plugins/${plugin.slug}`}
            >
              <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{plugin.displayName || plugin.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {plugin.description && (
                    <div className="text-sm text-muted-foreground mb-4">
                      {plugin.description}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeProvider;
