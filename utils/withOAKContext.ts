import config from "@config/config";
import OAKProvider from "~/lib/lib";
import { getPluginNameForSlug } from "../app/lib/plugins/plugins.server";
import { serverOnly$ } from "vite-env-only/macros";

export const withOAKContext = serverOnly$(
  <T extends (...args: any[]) => any>(fn: T) => {
    return ((args: any) => {
      const path = args.request.url.split("/");
      const indexOfPlugin = path.indexOf("plugins");
      const pluginSlug = path[indexOfPlugin + 1];
      const pluginName = getPluginNameForSlug(pluginSlug) as string;
      const context = {
        ...args.context,
        oakConfig: config,
        provider: OAKProvider(config, pluginName),
      };
      return fn({ ...args, context });
    }) as T;
  },
) as <T extends (...args: any[]) => any>(fn: T) => T;
