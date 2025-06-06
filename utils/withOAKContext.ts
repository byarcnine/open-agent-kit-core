import config from "@config/config";
import OAKProvider from "../app/lib/lib";
import { getPluginNameForSlug } from "../app/lib/plugins/plugins.server";
import { serverOnly$ } from "vite-env-only/macros";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import type { OAKConfig } from "../app/types/config";
import { getSession } from "~/lib/auth/auth.server";

type OakContext = {
  oakConfig: OAKConfig;
  provider: ReturnType<typeof OAKProvider>;
};

export type LoaderOrActionArgs = LoaderFunctionArgs | ActionFunctionArgs;

export type OAKLoaderOrActionArgs = Omit<LoaderOrActionArgs, "context"> & {
  context: OakContext;
};

export const withOAKContext = serverOnly$(
  <T extends (args: OAKLoaderOrActionArgs) => Promise<any>>(fn: T) => {
    return (async (args: LoaderOrActionArgs) => {
      const path = new URL(args.request.url).pathname.split("/");
      const indexOfPlugin = path.indexOf("plugins");
      // UI routes are prefix with /plugins/[pluginSlug|
      // global routes are prefix with the plugin identifier only
      const pluginSlug =
        indexOfPlugin !== -1 ? path[indexOfPlugin + 1] : path[0];
      const pluginSlugWithoutParams = pluginSlug.split("?")[0];
      const pluginName = getPluginNameForSlug(
        pluginSlugWithoutParams,
      ) as string;
      const session = await getSession(args.request);
      const user = session?.user;
      const context = {
        ...args.context,
        oakConfig: config,
        provider: OAKProvider(config, pluginName, user),
      };
      return fn({ ...args, context });
    }) as (args: LoaderOrActionArgs) => ReturnType<T>;
  },
)!;
