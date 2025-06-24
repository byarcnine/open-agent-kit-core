import {
  unstable_createContext,
  type unstable_MiddlewareFunction,
} from "react-router";
import OAKProvider from "../lib";
import { getConfig } from "../config/config";
import { getPluginNameForSlug } from "../plugins/plugins.server";
import { getSession } from "../auth/auth.server";

export const oakContext = unstable_createContext<{
  provider: ReturnType<typeof OAKProvider>;
}>();

export const OAKMiddleware: unstable_MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const config = getConfig();
  const path = new URL(request.url).pathname.split("/").filter((p) => !!p);
  const indexOfPlugin = path.indexOf("plugins");
  // UI routes are prefix with /plugins/[pluginSlug|
  // global routes are prefix with the plugin identifier only
  const pluginSlug = indexOfPlugin !== -1 ? path[indexOfPlugin + 1] : path[0];
  const session = await getSession(request);
  const user = session?.user;
  if (!pluginSlug) {
    // this route is not a plugin route. we can skip the middleware
    const provider = OAKProvider(config, "core", user);
    context.set(oakContext, { provider });
    return next();
  }
  const pluginSlugWithoutParams = pluginSlug.split("?")[0];
  const pluginName = getPluginNameForSlug(pluginSlugWithoutParams) as string;
  if (!pluginName) {
    // this route is not a plugin route. we can skip the middleware
    const provider = OAKProvider(config, "core", user);
    context.set(oakContext, { provider });
    return next();
  }
  const provider = OAKProvider(config, pluginName, user);
  context.set(oakContext, { provider });
  return next();
};
