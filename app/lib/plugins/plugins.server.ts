import type { PluginPackageJson, PluginType } from "~/types/plugins";
import type { ToolConfig } from "~/types/tools";

const importedPlugins: PluginType[] = [];

const pluginConfigs: Record<string, { default: PluginType }> = import.meta.glob(
  "/node_modules/oak-*/config.server.ts",
  {
    eager: true,
  },
);

const modulePackageJsons: Record<string, { default: PluginPackageJson }> =
  import.meta.glob("/node_modules/oak-*/package.json", {
    eager: true,
  });

// --------------------------
Object.entries(pluginConfigs).forEach(
  ([path, plugin]: [string, { default: PluginType }]) => {
    // Extract package path from the tool's file path
    let packageJsonPath;

    packageJsonPath =
      path.match(/(.+?node_modules\/[^/]+)\//)?.[1] + "/package.json";

    const packageInfo = packageJsonPath
      ? // localPackageJsons[packageJsonPath]
        modulePackageJsons[packageJsonPath]?.default
      : undefined;

    if (!packageInfo) return;
    importedPlugins.push({
      ...plugin.default,
      name: packageInfo.name,
      tools: plugin.default.tools,
    });
  },
);

export const getPlugins = (): PluginType[] => {
  return importedPlugins;
};

/**
 * Get tools for plugins
 * @param pluginIdentifiers - Optional array of plugin identifiers to filter by. If not provided, all tools will be returned.
 * @returns Promise<ToolConfig[]> - Array of tools
 */
export async function getTools(
  pluginIdentifiers?: string[],
): Promise<ToolConfig[]> {
  const toolPromises = importedPlugins
    .filter(
      (plugin) => !pluginIdentifiers || pluginIdentifiers.includes(plugin.name),
    )
    .map((plugin) => {
      if (typeof plugin.tools === "function") {
        return plugin.tools().then((tools) =>
          tools.map((tool) => ({
            ...tool,
            identifier: `${plugin.name}__${tool.identifier}`,
            pluginName: plugin.name,
          })),
        );
      }
      return plugin.tools?.map((tool) => ({
        ...tool,
        identifier: `${plugin.name}__${tool.identifier}`,
        pluginName: plugin.name,
      }));
    });

  const resolvedTools = await Promise.all(toolPromises);
  return resolvedTools.flat().filter((i) => !!i) as ToolConfig[];
}

export const getPluginNameForSlug = (slug: string) => {
  return importedPlugins.find((plugin) => plugin.slug === slug)?.name;
};
