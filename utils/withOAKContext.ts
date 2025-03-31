import config from "@config/config";
import OAKProvider from "~/lib/lib";
import { getPluginNameForSlug } from "../app/lib/plugins/plugins.server";
import { serverOnly$ } from "vite-env-only/macros";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import type { OAKConfig } from "~/types/config";

interface OakContext {
  oakConfig: OAKConfig;
  provider: ReturnType<typeof OAKProvider>;
}

type LoaderOrActionArgs = LoaderFunctionArgs | ActionFunctionArgs;
export type OAKLoaderOrActionArgs = LoaderOrActionArgs & {
  context: OakContext;
};

export const withOAKContext = serverOnly$(
  <
    T extends (
      args: LoaderOrActionArgs & { context: OakContext },
    ) => ReturnType<T>,
  >(
    fn: T,
  ) => {
    return ((args: LoaderOrActionArgs) => {
      const path = args.request.url.split("/");
      const indexOfPlugin = path.indexOf("plugins");
      const pluginSlug = path[indexOfPlugin + 1];
      // remove url params from pluginSlug
      const pluginSlugWithoutParams = pluginSlug.split("?")[0];
      const pluginName = getPluginNameForSlug(pluginSlugWithoutParams) as string;
      const context = {
        ...args.context,
        oakConfig: config,
        provider: OAKProvider(config, pluginName),
      };
      return fn({ ...args, context });
    }) as (args: LoaderOrActionArgs) => Promise<ReturnType<T>>;
  },
) as <
  T extends (
    args: LoaderOrActionArgs & { context: OakContext },
  ) => Promise<any>,
>(
  fn: T,
) => (args: LoaderOrActionArgs) => ReturnType<T>;
