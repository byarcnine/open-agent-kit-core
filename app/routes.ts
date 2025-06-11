import {
  index,
  route,
  prefix,
  type RouteConfig,
  layout,
} from "@react-router/dev/routes";

import { getPlugins } from "./lib/plugins/plugins.server";

const plugins = getPlugins();

export const routes = (
  corePrefix: string,
  routesDirPrefix: string = "../node_modules/",
) => {
  return [
    // Core routes
    route("api/auth/*", `${corePrefix}/api.auth.$.ts`),
    route("auth/login", `${corePrefix}/auth.login.tsx`),
    route("auth/register", `${corePrefix}/auth.register.tsx`),
    route("auth/resetPassword", `${corePrefix}/auth.resetPassword.tsx`),
    route("user/settings", `${corePrefix}/user.settings.tsx`),

    // UI admin routes
    layout(`${corePrefix}/admin.layout.tsx`, [
      index(`${corePrefix}/_index.tsx`),
      route("settings", `${corePrefix}/settings.tsx`),
      route("plugins", `${corePrefix}/plugins.tsx`),
      route("permissions", `${corePrefix}/permission._index.tsx`),
      route(
        "permissions/group/:groupId",
        `${corePrefix}/permission.group.$groupId.tsx`,
      ),
      route("space/:spaceId", `${corePrefix}/space.$spaceId._index.tsx`),
      // Agent-specific routes
      layout(`${corePrefix}/agent.$agentId.tsx`, [
        ...prefix("/space/:spaceId/agent/:agentId/", [
          index(`${corePrefix}/agent.$agentId._index.tsx`),
          route("feedback", `${corePrefix}/agent.$agentId.feedback.tsx`),
          route("plugins", `${corePrefix}/agent.$agentId.plugins._index.tsx`),
          route("prompts", `${corePrefix}/agent.$agentId.prompts._index.tsx`),
          route("settings", `${corePrefix}/agent.$agentId.settings.tsx`),
          // route("users", `${corePrefix}/agent.$agentId.users.tsx`),
          route(
            "conversations",
            `${corePrefix}/agent.$agentId.conversations._index.tsx`,
          ),
          route(
            "conversations/:id",
            `${corePrefix}/agent.$agentId.conversations.$id.tsx`,
          ),
          // ...routeArray.map((r) => route(r.routePath, r.relativePath)),
          ...plugins
            .filter((p) => (p.adminRoutes ?? p.routes) !== undefined)
            .flatMap((p) =>
              prefix(
                `plugins/${p.slug}`,
                (p.adminRoutes ?? p.routes)
                  ?.map((r) => {
                    if (r.index) {
                      return index(`${routesDirPrefix}${p.name}/${r.file}`);
                    }
                    if (r.path?.startsWith("//")) {
                      return undefined;
                    }
                    return route(
                      r.path,
                      `${routesDirPrefix}${p.name}/${r.file}`,
                    );
                  })
                  .filter((r) => r !== undefined) || [],
              ),
            ),
          // Knowledge Routes
          layout(`${corePrefix}/agent.$agentId.knowledge.tsx`, [
            ...prefix("knowledge/", [
              index(`${corePrefix}/agent.$agentId.knowledge.documents.tsx`),
              route(
                "settings",
                `${corePrefix}/agent.$agentId.knowledge.settings.tsx`,
              ),
            ]),
          ]),
        ]),
      ]),
    ]),
    // Chat routes
    layout(`${corePrefix}/chat.$agentId.tsx`, [
      route("chat/:agentId", `${corePrefix}/chat.$agentId._index.tsx`),
      ...plugins
        .filter((p) => p.userRoutes !== undefined)
        .flatMap((p) =>
          prefix(
            `chat/:agentId/plugins/${p.slug}`,
            p.userRoutes
              ?.map((r) => {
                if (r.index) {
                  return index(`${routesDirPrefix}${p.name}/${r.file}`);
                }
                if (r.path?.startsWith("//")) {
                  return undefined;
                }
                return route(r.path, `${routesDirPrefix}${p.name}/${r.file}`);
              })
              .filter((r) => r !== undefined) || [],
          ),
        ),
      route(
        "chat/:agentId/:conversationId",
        `${corePrefix}/chat.$agentId.$conversationId.tsx`,
      ),
    ]),
    route(
      "chat/:agentId/loadMoreConversations",
      `${corePrefix}/chat.$agentId.loadMoreConversations.tsx`,
    ),

    // Other routes
    route("invite/:id", `${corePrefix}/invite.$id.tsx`),
    route("embed/:agentId", `${corePrefix}/embed.$agentId.tsx`),
    route("cron", `${corePrefix}/cron.tsx`),

    // API routes
    route("api/generate", `${corePrefix}/api.generate.ts`),
    route("api/generate/token", `${corePrefix}/api.generate.token.ts`),
    route(
      "api/agentChatSettings/:agentId",
      `${corePrefix}/api.agentChatSettings.$agentId.ts`,
    ),
    ...(plugins.flatMap((p) => {
      const combinedRoutes = [
        ...(p.userRoutes ?? []),
        ...(p.adminRoutes ?? []),
      ];
      return combinedRoutes
        .filter((r) => r.path?.startsWith("//"))
        .map((r) =>
          route(
            `${p.name}/${r.path?.replace("//", "")}`,
            `${routesDirPrefix}${p.name}/${r.file}`,
          ),
        );
    }) || []),
    route("api/feedback", `${corePrefix}/api.feedback.ts`),
  ] satisfies RouteConfig;
};

export default routes("./routes");
