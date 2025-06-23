import type { SessionUser } from "~/types/auth";
import { getConfig } from "../config/config";
import OAKProvider from "../lib";
import { getToolsForAgent } from "../tools/tools.server";
import { prisma, type User } from "@db/db.server";
import {
  experimental_createMCPClient as createMCPClient,
  type Message,
  type Tool,
} from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";
import type { DefaultTools } from "~/types/tools";

const getMCPTools = async (agentId: string) => {
  const mcpConnections = await prisma.mCPs.findMany({
    where: {
      agentId: agentId,
    },
  });
  return mcpConnections.map(async (mcp) => {
    try {
      const type = mcp.type;
      if (type === "SSE") {
        const connectionArgs = mcp.connectionArgs as {
          url: string;
          [x: string]: any;
        };
        const { url, ...additionalArgs } = connectionArgs;

        const mcpClient = await createMCPClient({
          transport: {
            type: "sse",
            url: url,
            ...(additionalArgs || {}),
          },
        });

        // Try to get tools to verify connection
        return {
          tools: Object.entries(await mcpClient.tools()) as [string, Tool][],
          close: async () => {
            await mcpClient.close();
          },
        };
      } else if (type === "STDIO") {
        const connectionArgs = mcp.connectionArgs as {
          command: string;
          args: string;
        };
        const command = connectionArgs.command;
        const args = connectionArgs.args;

        const mcpClient = await createMCPClient({
          transport: new StdioMCPTransport({
            command,
            args: args ? args.split(" ") : [],
          }),
        });
        return {
          tools: Object.entries(await mcpClient.tools()) as [string, Tool][],
          close: async () => {
            await mcpClient.close();
          },
        };
      }
      return {
        tools: [],
        close: async () => {},
      };
    } catch (e) {
      console.error(e);
      return {
        tools: [],
        close: async () => {},
      };
    }
  });
};

export const prepareToolsForAgent = async (
  agentId: string,
  conversationId: string,
  meta: Record<string, any>,
  messages: Message[],
  user?: User | SessionUser | null,
  defaultTools?: DefaultTools,
) => {
  const pluginToolsPromise = getToolsForAgent(agentId, defaultTools).then(
    async (r) => {
      // get tools ready
      return Promise.all(
        r.map(async (t) => {
          return [
            t.identifier,
            await t.tool({
              conversationId: conversationId,
              agentId,
              meta,
              config: getConfig(),
              provider: OAKProvider(getConfig(), t.pluginName as string, user),
              messages,
            }),
          ];
        }),
      );
    },
  );
  const mcpPromise = await Promise.all(await getMCPTools(agentId));
  const [pluginTools, mcps] = await Promise.all([
    pluginToolsPromise,
    mcpPromise,
  ]);
  const flatMcpTools = mcps.map((t) => t.tools).flat();
  const close = async () => {
    await Promise.all(mcps.map((t) => t.close()));
  };
  return {
    tools: [...pluginTools, ...flatMcpTools],
    closeMCPs: close,
  };
};
