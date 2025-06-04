import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  useLoaderData,
  useFetcher,
  useActionData,
  useNavigation,
  data,
  Form,
} from "react-router";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import {
  getPluginsWithAvailability,
  setPluginAvailability,
} from "~/lib/plugins/availability.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useState, useEffect } from "react";
import { Settings, Loader, Package, ExternalLink, Box } from "react-feather";
import { prisma } from "@db/db.server";
import AgentAvailabilitySelector from "~/components/agentAvailabilitySelector/agentAvailabilitySelector";
import { toast, Toaster } from "sonner";
import type { PluginWithAvailability } from "~/types/plugins";
import { Badge } from "~/components/ui/badge";
import { PERMISSIONS, type SessionUser } from "~/types/auth";
import NoDataCard from "~/components/ui/no-data-card";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import pkg from "../../package.json";
import { cn } from "~/lib/utils";

// Define the return type for the add NPM plugin action
type AddNpmPluginResponse =
  | {
      _action: "addNPMPlugin";
      success: true;
      error?: never;
      pluginName: string;
    }
  | {
      _action: "addNPMPlugin";
      success?: never;
      error: string;
      pluginName?: never;
    };

type SetAvailabilityResponse = {
  success: boolean;
};

// Update ActionResponse to include AddNpmPluginResponse
type ActionResponse = AddNpmPluginResponse | SetAvailabilityResponse;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccess(request, PERMISSIONS.EDIT_GLOBAL_SETTINGS);
  const agentsPromise = prisma.agent.findMany({ orderBy: { name: "asc" } });
  const pluginsWithAvailabilityPromise = getPluginsWithAvailability();

  // Get NPM plugins from database
  const npmPluginsConfigPromise = prisma.globalConfig.findUnique({
    where: { key: "npm_plugins" },
  });

  const [agents, plugins, npmPluginsConfig] = await Promise.all([
    agentsPromise,
    pluginsWithAvailabilityPromise,
    npmPluginsConfigPromise,
  ]);

  const installedPlugins = pkg.dependencies as Record<string, string>;

  const npmPlugins = ((npmPluginsConfig?.value as string[]) || []).map(
    (plugin: string) => {
      return {
        name: plugin,
        isInstalled: installedPlugins[plugin] !== undefined,
      };
    },
  );

  return { agents, plugins, npmPlugins, user: user as SessionUser };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await hasAccess(request, PERMISSIONS.EDIT_GLOBAL_SETTINGS);

  const formData = await request.formData();
  const formAction = formData.get("_action") as string;

  if (formAction === "addNPMPlugin") {
    const pluginName = formData.get("pluginName") as string;

    if (!pluginName || pluginName.trim() === "") {
      return data(
        { _action: "addNPMPlugin", error: "Plugin name is required" },
        { status: 400 },
      );
    }

    try {
      // Use a transaction to safely add the plugin to the global config
      await prisma.$transaction(async (tx) => {
        // First, try to find the existing npm_plugins config
        const existingConfig = await tx.globalConfig.findUnique({
          where: { key: "npm_plugins" },
        });

        if (existingConfig) {
          // Config exists, update it by adding the new plugin
          const currentPlugins = existingConfig.value as string[];

          // Check if plugin already exists to avoid duplicates
          if (!currentPlugins.includes(pluginName)) {
            await tx.globalConfig.update({
              where: { key: "npm_plugins" },
              data: {
                value: [...currentPlugins, pluginName],
              },
            });
          }
        } else {
          // Config doesn't exist, create it with the new plugin
          await tx.globalConfig.create({
            data: {
              key: "npm_plugins",
              value: [pluginName],
            },
          });
        }
      });

      if (process.env.REDEPLOY_HOOK_URL) {
        await fetch(process.env.REDEPLOY_HOOK_URL as string, {
          method: "POST",
          body: JSON.stringify({
            pluginName,
          }),
        });
      } else {
        console.warn(
          "Redeploy hook URL not found. Please set the REDEPLOY_HOOK_URL environment variable.",
        );
      }

      // call the redeploy hook URL
      return data({
        _action: "addNPMPlugin",
        success: true,
        pluginName,
      });
    } catch (error) {
      console.error("Error adding NPM plugin:", error);
      return data(
        {
          _action: "addNPMPlugin",
          error: `Failed to add NPM plugin: ${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 500 },
      );
    }
  }

  // Handle existing plugin availability action
  const pluginIdentifier = formData.get("pluginIdentifier") as string;
  const isGlobal = formData.get("isGlobal") === "true";
  const agentIds = JSON.parse(formData.get("agentIds") as string);

  await setPluginAvailability(pluginIdentifier, isGlobal, agentIds);
  return { success: true };
};

export default function Plugins() {
  const { plugins, user, agents, npmPlugins } = useLoaderData<typeof loader>();
  const [selectedPluginIdentifier, setSelectedPluginIdentifier] = useState<
    string | null
  >(null);
  const [isAddNpmPluginOpen, setIsAddNpmPluginOpen] = useState(false);
  const [addNpmPluginError, setAddNpmPluginError] = useState<string | null>(
    null,
  );
  const [addNpmPluginSuccess, setAddNpmPluginSuccess] = useState(false);
  const fetcher = useFetcher();
  const actionData = useActionData<ActionResponse>();
  const navigation = useNavigation();
  const isSubmittingAddNpmPlugin =
    navigation.state === "submitting" &&
    navigation.formData?.get("_action") === "addNPMPlugin";

  // Resets the state associated with the 'Add NPM Plugin' dialog whenever it is closed.
  useEffect(() => {
    if (!isAddNpmPluginOpen) {
      setAddNpmPluginError(null);
      setAddNpmPluginSuccess(false);
    }
  }, [isAddNpmPluginOpen]);

  // Handles the response from the 'addNPMPlugin' action. Updates the UI state
  // based on success or failure, displays errors, shows success messages.
  useEffect(() => {
    if (
      actionData &&
      "_action" in actionData &&
      actionData._action === "addNPMPlugin"
    ) {
      if (actionData.error) {
        setAddNpmPluginError(actionData.error);
        setAddNpmPluginSuccess(false);
      } else if (actionData.success) {
        setAddNpmPluginError(null);
        setAddNpmPluginSuccess(true);
      }
    }
  }, [actionData]);

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
    <Layout navComponent={<OverviewNav user={user} />} user={user}>
      <div className="w-full py-8 px-4 md:p-8 flex flex-col">
        <div className="flex flex-row items-center justify-between pb-8">
          <h1 className="text-3xl font-medium">Installed Plugins</h1>
          <Dialog
            open={isAddNpmPluginOpen}
            onOpenChange={setIsAddNpmPluginOpen}
          >
            <DialogTrigger asChild>
              <Button>Add NPM Plugin</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add NPM Plugin</DialogTitle>
                <DialogDescription>
                  Add an NPM package as a plugin to extend agent capabilities
                  globally
                </DialogDescription>
              </DialogHeader>

              {addNpmPluginError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{addNpmPluginError}</AlertDescription>
                </Alert>
              )}

              {addNpmPluginSuccess && (
                <Alert className="mt-2 border-green-500 text-green-700 dark:border-green-700 [&>svg]:text-green-700 dark:[&>svg]:text-green-500">
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    NPM plugin added successfully! The plugin will be available
                    after the next rebuild.
                  </AlertDescription>
                </Alert>
              )}

              {addNpmPluginSuccess ? (
                <DialogFooter>
                  <Button onClick={() => setIsAddNpmPluginOpen(false)}>
                    Continue
                  </Button>
                </DialogFooter>
              ) : (
                <Form method="post" className="space-y-4 mt-4">
                  <input type="hidden" name="_action" value="addNPMPlugin" />

                  <div className="space-y-2">
                    <Label htmlFor="pluginName">NPM Package Name</Label>
                    <Input
                      id="pluginName"
                      name="pluginName"
                      placeholder="@example/agent-plugin"
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter the exact NPM package name (e.g., @langchain/core,
                      uuid, axios)
                    </p>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={isSubmittingAddNpmPlugin}>
                      {isSubmittingAddNpmPlugin ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Adding...
                        </>
                      ) : (
                        "Add Plugin"
                      )}
                    </Button>
                  </DialogFooter>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex flex-col flex-1">
          {(!plugins || plugins.length === 0) &&
          (!npmPlugins || npmPlugins.length === 0) ? (
            <NoDataCard
              headline="No plugins found"
              description="There are no plugins available for your agents."
              className="my-auto"
            />
          ) : (
            <div className="space-y-8">
              {/* Active Plugins Section */}
              {plugins && plugins.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5" />
                    <h2 className="text-xl font-semibold">Active Plugins</h2>
                    <Badge variant="secondary" className="ml-2">
                      {plugins.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xxl:grid-cols-4 gap-4">
                    {plugins.map((plugin) => (
                      <Card key={plugin.name} className="flex flex-col">
                        <CardHeader className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">
                                {plugin.displayName}
                              </CardTitle>
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-1"
                              >
                                Built-in
                              </Badge>
                            </div>
                            <button
                              onClick={() =>
                                setSelectedPluginIdentifier(plugin.name)
                              }
                              className="opacity-60 hover:opacity-100 transition-opacity"
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
                            {!plugin.isGlobal &&
                              plugin.agents &&
                              plugin.agents.length > 0 && (
                                <h3 className="text-xs mb-2 text-muted-foreground font-medium">
                                  Available for Agents:
                                </h3>
                              )}
                            {!plugin.isGlobal && (
                              <div className="text-sm text-muted-foreground flex flex-wrap gap-2 max-w-full">
                                {plugin.agents.map((agent) => (
                                  <div key={agent.id}>
                                    <Badge variant="outline">
                                      {agent.name}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* NPM Plugins Section */}
              {npmPlugins && npmPlugins.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Box className="w-5 h-5" />
                    <h2 className="text-xl font-semibold">NPM Plugins</h2>
                    <Badge variant="secondary" className="ml-2">
                      {npmPlugins.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xxl:grid-cols-4 gap-4">
                    {npmPlugins.map((plugin) => (
                      <Card key={plugin.name} className="flex flex-col">
                        <CardHeader className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">
                                {plugin.name}
                              </CardTitle>
                              <Badge
                                variant="secondary"
                                className="text-xs px-2 py-1"
                              >
                                NPM
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            NPM package added to global configuration
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-col">
                            <Badge
                              className={cn(
                                "mb-2 justify-center mr-auto",
                                plugin.isInstalled
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
                              )}
                              variant="outline"
                            >
                              {plugin.isInstalled ? "Installed" : "Pending"}
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              This plugin will be available after the next
                              application rebuild.
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state when we have no plugins of either type */}
              {(!plugins || plugins.length === 0) &&
                (!npmPlugins || npmPlugins.length === 0) && (
                  <NoDataCard
                    headline="No plugins installed"
                    description="Install plugins to extend your agents' capabilities."
                    className="my-auto"
                  />
                )}
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
