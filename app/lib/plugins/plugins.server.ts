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
      tools: plugin.default.tools?.map((t) => ({
        ...t,
        pluginName: packageInfo.name,
      })),
    });
  },
);

export const getPlugins = (): PluginType[] => {
  return importedPlugins;
};

export function getTools(): ToolConfig[] {
  return importedPlugins
    .map((plugin) =>
      plugin.tools?.map((tool) => ({
        ...tool,
        pluginName: plugin.name,
      })),
    )
    .flat()
    .filter((i) => !!i);
}

export const getPluginNameForSlug = (slug: string) => {
  return importedPlugins.find((plugin) => plugin.slug === slug)?.name;
};
