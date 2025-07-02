import {
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  useLoaderData,
  useFetcher,
  useActionData,
  useNavigation,
  data,
  Form,
  Await,
  type MetaFunction,
} from "react-router";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import {
  getPluginsWithAvailability,
  setPluginAvailability,
} from "~/lib/plugins/availability.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useState, useEffect, Suspense } from "react";
import {
  Settings,
  Loader,
  Package,
  ExternalLink,
  Download,
} from "react-feather";
import { prisma } from "@db/db.server";
import AgentAvailabilitySelector from "~/components/agentAvailabilitySelector/agentAvailabilitySelector";
import { toast, Toaster } from "sonner";
import type { PluginWithAvailability } from "~/types/plugins";
import { Badge } from "~/components/ui/badge";
import { type SessionUser } from "~/types/auth";
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
import {
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";

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

type NpmPlugin = {
  name: string;
  status: "pending" | "installed" | "failed";
  lastUpdated: string; // ISO string
};

// Add type for store plugins
type StorePlugin = {
  name: string;
  description: string;
  url: string;
  icon: string;
  categories: string[];
};

// Add type for remove plugin action
type RemovePluginResponse = {
  _action: "removePlugin";
  success: boolean;
  error?: string;
};

// Update ActionResponse to include RemovePluginResponse
type ActionResponse =
  | AddNpmPluginResponse
  | SetAvailabilityResponse
  | RemovePluginResponse
  | NpmPlugin;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.view_plugins"],
  );

  // Fetch spaces and agents separately
  const spacesPromise = prisma.space.findMany({
    include: {
      agents: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const pluginsWithAvailabilityPromise = getPluginsWithAvailability();

  // Get NPM plugins from database
  const npmPluginsConfigPromise = prisma.globalConfig.findUnique({
    where: { key: "npm_plugins" },
  });

  // Fetch store plugins from the API
  const storePluginsPromise = fetch(
    "https://api.open-agent-kit.com/plugins/list",
  )
    .then((response) => response.json())
    .then((data) => ({
      plugins: data.plugins as StorePlugin[],
      total: data.total as number,
    }))
    .catch((error) => {
      console.error("Failed to fetch store plugins:", error);
      return {
        plugins: [] as StorePlugin[],
        total: 0,
      };
    });

  const [spaces, plugins, npmPluginsConfig] = await Promise.all([
    spacesPromise,
    pluginsWithAvailabilityPromise,
    npmPluginsConfigPromise,
  ]);

  const npmPlugins = ((npmPluginsConfig?.value as NpmPlugin[]) || []).map(
    (plugin) => {
      const installed = plugins.find((p) => p.name === plugin.name);
      return {
        ...plugin,
        isInstalled: plugins.some((p) => p.name === plugin.name),
        isFailed: installed && plugin.status === "failed",
      };
    },
  );

  const hasPendingPlugins = npmPlugins.some(
    (plugin) => plugin.status === "pending",
  );

  const hasFailedPlugins = npmPlugins.some(
    (plugin) => plugin.status === "failed",
  );

  // Get the first failed plugin for the error dialog
  const firstFailedPlugin =
    npmPlugins.find((plugin) => plugin.status === "failed") || null;

  // Get counts for UI display
  const pendingPluginsCount = npmPlugins.filter(
    (plugin) => plugin.status === "pending",
  ).length;

  // Get pending plugins list for UI display
  const pendingPluginsList = npmPlugins.filter(
    (plugin) => plugin.status === "pending",
  );
  const userScopes = await getUserScopes(user);

  return {
    spaces,
    plugins,
    npmPlugins,
    storePluginsPromise,
    user: user as SessionUser,
    hasPendingPlugins,
    hasFailedPlugins,
    firstFailedPlugin,
    pendingPluginsCount,
    pendingPluginsList,
    userScopes,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await hasAccessHierarchical(request, PERMISSION["global.edit_plugins"]);

  const formData = await request.formData();
  const formAction = formData.get("_action") as string;

  if (formAction === "removePlugin") {
    const pluginName = formData.get("pluginName") as string;

    if (!pluginName || pluginName.trim() === "") {
      return data(
        {
          _action: "removePlugin",
          error: "Plugin name is required",
          success: false,
        },
        { status: 400 },
      );
    }

    try {
      // Remove the plugin from the npm_plugins config
      await prisma.$transaction(async (tx) => {
        const existingConfig = await tx.globalConfig.findUnique({
          where: { key: "npm_plugins" },
        });

        if (existingConfig) {
          const currentPlugins = existingConfig.value as NpmPlugin[];
          const updatedPlugins = currentPlugins.filter(
            (p) => p.name !== pluginName,
          );

          await tx.globalConfig.update({
            where: { key: "npm_plugins" },
            data: {
              value: updatedPlugins,
            },
          });
        }
      });

      return data({
        _action: "removePlugin",
        success: true,
      });
    } catch (error) {
      console.error("Error removing plugin:", error);
      return data(
        {
          _action: "removePlugin",
          error: `Failed to remove plugin: ${error instanceof Error ? error.message : String(error)}`,
          success: false,
        },
        { status: 500 },
      );
    }
  }

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
          const currentPlugins = existingConfig.value as NpmPlugin[];

          // Check if plugin already exists to avoid duplicates
          if (!currentPlugins.find((p) => p.name === pluginName)) {
            await tx.globalConfig.update({
              where: { key: "npm_plugins" },
              data: {
                value: [
                  ...currentPlugins,
                  {
                    name: pluginName,
                    status: "pending",
                    lastUpdated: new Date().toISOString(),
                  },
                ],
              },
            });
          }
        } else {
          // Config doesn't exist, create it with the new plugin
          await tx.globalConfig.create({
            data: {
              key: "npm_plugins",
              value: [
                {
                  name: pluginName,
                  status: "pending",
                  lastUpdated: new Date().toISOString(),
                },
              ],
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
  const spaceIds = JSON.parse((formData.get("spaceIds") as string) || "[]");

  await setPluginAvailability(pluginIdentifier, isGlobal, agentIds, spaceIds);
  return { success: true };
};

export default function Plugins() {
  const {
    plugins,
    user,
    spaces,
    npmPlugins,
    storePluginsPromise,
    hasPendingPlugins,
    firstFailedPlugin,
    userScopes,
  } = useLoaderData<typeof loader>();
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

  // Handle removal of failed plugin
  const handleAcknowledgeError = () => {
    if (firstFailedPlugin) {
      const formData = new FormData();
      formData.append("_action", "removePlugin");
      formData.append("pluginName", firstFailedPlugin.name);

      fetcher.submit(formData, { method: "POST" });
    }
  };

  // Helper function to get the NPM package name from the URL
  const getNpmPackageName = (url: string): string => {
    const urlParts = url.split("/");
    return urlParts[urlParts.length - 1];
  };

  // Helper function to check if a store plugin is already installed
  const isStorePluginInstalled = (storePlugin: StorePlugin): boolean => {
    const packageName = getNpmPackageName(storePlugin.url);
    return plugins.some((p) => p.name === packageName);
  };

  // Helper function to check if a store plugin is pending installation
  const isStorePluginPending = (storePlugin: StorePlugin): boolean => {
    const packageName = getNpmPackageName(storePlugin.url);
    return npmPlugins.some(
      (plugin) => plugin.name === packageName && plugin.status === "pending",
    );
  };

  // Helper function to check if a store plugin has failed installation
  const isStorePluginFailed = (storePlugin: StorePlugin): boolean => {
    const packageName = getNpmPackageName(storePlugin.url);
    return npmPlugins.some(
      (plugin) => plugin.name === packageName && plugin.status === "failed",
    );
  };

  // Function to install a store plugin
  const installStorePlugin = (storePlugin: StorePlugin) => {
    const packageName = getNpmPackageName(storePlugin.url);
    const formData = new FormData();
    formData.append("_action", "addNPMPlugin");
    formData.append("pluginName", packageName);

    fetcher.submit(formData, { method: "POST" });
  };

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

  const onSetAvailability = async (
    isGlobal: boolean,
    agentIds: string[],
    spaceIds: string[],
  ) => {
    if (!selectedPluginIdentifier) return;
    fetcher.submit(
      {
        pluginIdentifier: selectedPluginIdentifier,
        isGlobal: isGlobal.toString(),
        agentIds: JSON.stringify(agentIds),
        spaceIds: JSON.stringify(spaceIds),
      },
      { method: "POST" },
    );
    toast.success(
      `Successfully updated ${selectedPluginIdentifier} availability`,
    );
  };

  return (
    <>
      <div className="w-full py-8 px-4 md:p-8 flex flex-col">
        {hasPendingPlugins && (
          <div className="mb-6 relative overflow-hidden rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 dark:border-orange-800 dark:from-orange-950 dark:to-amber-950">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-100/50 to-amber-100/50 dark:from-orange-900/30 dark:to-amber-900/30"></div>
            <div className="relative px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Loader className="h-6 w-6 text-orange-600 dark:text-orange-400 animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                        Installing Plugins
                      </h3>
                      <p className="mt-1 text-sm text-orange-700 dark:text-orange-300">
                        {
                          npmPlugins.filter((p) => p.status === "pending")
                            .length
                        }{" "}
                        plugin(s) are being installed and will be available
                        after the next rebuild:
                      </p>
                      <ul className="mt-1 text-sm text-orange-700 dark:text-orange-300 list-disc list-inside">
                        {npmPlugins
                          .filter((p) => p.status === "pending")
                          .map((plugin) => (
                            <li key={plugin.name}>{plugin.name}</li>
                          ))}
                      </ul>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                    >
                      {npmPlugins.filter((p) => p.status === "pending").length}{" "}
                      pending
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Progress bar animation */}
              <div className="mt-3 relative">
                <div className="overflow-hidden h-2 bg-orange-200 dark:bg-orange-800 rounded-full">
                  <div className="h-full bg-gradient-to-r from-orange-400 to-amber-400 dark:from-orange-500 dark:to-amber-500 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Dialog for Failed Plugin Installation */}
        <Dialog
          open={!!firstFailedPlugin}
          onOpenChange={(open) => !open && handleAcknowledgeError()}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Package className="w-5 h-5" />
                Plugin Installation Failed
              </DialogTitle>
              <DialogDescription>
                The following plugin failed to install and will be removed from
                the installation queue.
              </DialogDescription>
            </DialogHeader>

            {firstFailedPlugin && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle className="text-sm text-red-600 dark:text-red-400">
                  Failed Plugin: {firstFailedPlugin.name}
                </AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground">
                  The plugin installation encountered an error during the build
                  process. This could be due to incompatible dependencies,
                  network issues, or the plugin not being available on NPM.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="mt-6">
              <Button onClick={handleAcknowledgeError} className="w-full">
                Acknowledge and Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="flex flex-row items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Installed Plugins</h1>
        </div>
        <div className="flex flex-col flex-1 mb-8">
          {!plugins || plugins.length === 0 ? (
            <NoDataCard
              headline="No plugins installed"
              description="There are currently no plugins installed. You can add local plugins through the plugins folder in your project or install plugins from the store."
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
                            {!plugin.isGlobal && (
                              <>
                                {plugin.spaces && plugin.spaces.length > 0 && (
                                  <>
                                    <h3 className="text-xs mb-2 text-muted-foreground font-medium">
                                      Available for Spaces:
                                    </h3>
                                    <div className="text-sm text-muted-foreground flex flex-wrap gap-2 max-w-full mb-2">
                                      {plugin.spaces.map((space) => (
                                        <div key={space.id}>
                                          <Badge variant="outline">
                                            {space.name}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                                {plugin.agents && plugin.agents.length > 0 && (
                                  <>
                                    <h3 className="text-xs mb-2 text-muted-foreground font-medium">
                                      Available for Agents:
                                    </h3>
                                    <div className="text-sm text-muted-foreground flex flex-wrap gap-2 max-w-full">
                                      {plugin.agents.map((agent) => (
                                        <div key={agent.id}>
                                          <Badge variant="outline">
                                            {agent.name}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Store</h2>
              <Suspense>
                <Await resolve={storePluginsPromise}>
                  {(storePluginsData) => (
                    <Badge variant="secondary" className="ml-2">
                      {storePluginsData.total}
                    </Badge>
                  )}
                </Await>
              </Suspense>
            </div>
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
                    Add a plugin to OAK to extend agent capabilities.
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
                      NPM plugin added successfully! The plugin will be
                      available after the next rebuild.
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
                        Enter the exact NPM package name (e.g., oak-translator,
                        oak-sample-plugin, oak-google-drive)
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

          <Suspense fallback={<div>Loading store plugins...</div>}>
            <Await resolve={storePluginsPromise}>
              {(storePluginsData) => {
                // Handle the data structure properly - it could be an array or an object with plugins property
                const storePlugins = Array.isArray(storePluginsData)
                  ? storePluginsData
                  : storePluginsData.plugins || [];

                if (!storePlugins || storePlugins.length === 0) {
                  return (
                    <div className="text-center text-muted-foreground">
                      No store plugins available.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xxl:grid-cols-4 gap-4">
                    {storePlugins.map((plugin: StorePlugin) => {
                      const isInstalled = isStorePluginInstalled(plugin);
                      const isPending = isStorePluginPending(plugin);
                      const isFailed = isStorePluginFailed(plugin);

                      return (
                        <Card key={plugin.name} className="flex flex-col">
                          <CardHeader className="flex flex-col">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {plugin.icon && (
                                  <img
                                    src={plugin.icon}
                                    alt={`${plugin.name} icon`}
                                    className="w-6 h-6 rounded"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                )}
                                <CardTitle className="text-base">
                                  {plugin.name}
                                </CardTitle>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-1"
                                >
                                  Store
                                </Badge>
                                <a
                                  href={plugin.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="opacity-60 hover:opacity-100 transition-opacity"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                            {plugin.description && (
                              <div className="text-sm text-muted-foreground mb-4">
                                {plugin.description}
                              </div>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-col space-y-3">
                              {plugin.categories &&
                                plugin.categories.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {plugin.categories.map(
                                      (category: string) => (
                                        <Badge
                                          key={category}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {category}
                                        </Badge>
                                      ),
                                    )}
                                  </div>
                                )}

                              <div className="mt-auto">
                                {isInstalled ? (
                                  <Badge
                                    className="w-full justify-center bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    variant="outline"
                                  >
                                    Installed
                                  </Badge>
                                ) : isPending ? (
                                  <Badge
                                    className="w-full justify-center bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                    variant="outline"
                                  >
                                    Installing...
                                  </Badge>
                                ) : isFailed ? (
                                  <Badge
                                    className="w-full justify-center bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    variant="outline"
                                  >
                                    Failed
                                  </Badge>
                                ) : (
                                  <Button
                                    onClick={() => installStorePlugin(plugin)}
                                    className="w-full"
                                    size="sm"
                                    disabled={fetcher.state === "submitting"}
                                  >
                                    {fetcher.state === "submitting" ? (
                                      <>
                                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        Installing...
                                      </>
                                    ) : (
                                      <>
                                        <Download className="mr-2 h-4 w-4" />
                                        Install
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                );
              }}
            </Await>
          </Suspense>
        </div>
        <AgentAvailabilitySelector
          spaces={spaces}
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
    </>
  );
}

export const meta: MetaFunction = () => {
  return [
    { title: "Plugins" },
    { name: "description", content: "Manage plugins for your agents" },
  ];
};
