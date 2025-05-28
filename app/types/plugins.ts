import type { Agent } from "@prisma/client";
import type {
  SyncKnowledgeFunctionParams,
  SyncKnowledgeFunctionReturnParams,
} from "./knowledgeProvider";
import type { ToolConfig } from "./tools";
import type { RouteConfigEntry } from "@react-router/dev/routes";

export type MenuItem = {
  label: string;
  href: string;
  icon: keyof typeof import("react-feather");
};

export type PluginType = {
  name: string;
  displayName: string;
  description: string;
  slug: string;
  syncKnowledge?: (
    params: SyncKnowledgeFunctionParams,
  ) => Promise<SyncKnowledgeFunctionReturnParams>;
  /** @deprecated use adminRoutes instead */
  routes?: RouteConfigEntry[];
  /**
   * @description Use this to add routes for the admin panel (mostly for settings or API routes)
   */
  adminRoutes?: RouteConfigEntry[];
  /**
   * @description Use this to add user facing routes for the plugin
   */
  userRoutes?: RouteConfigEntry[];
  menuItems?: MenuItem[];
  tools?: ToolConfig[] | (() => Promise<ToolConfig[]>);
};

export type PluginConfig = Omit<PluginType, "name">;

export type PluginWithAvailability = Omit<PluginType, "tools"> & {
  isGlobal: boolean;
  agents: Agent[];
};

export type PluginPackageJson = {
  name: string;
  displayName: string;
  description: string;
  slug: string;
};
