import { experimental_createMCPClient as createMCP } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";
import { MCPType, prisma } from "@db/db.server";

export const createMCPClient = ({
  transport,
}: {
  transport:
    | { type: "sse"; url: string; headers?: Record<string, string> }
    | { type: "stdio"; command: string; args?: string };
}): ReturnType<typeof createMCP> => {
  if (transport.type === "sse") {
    return createMCP({
      transport: {
        type: "sse",
        url: transport.url,
        headers: transport.headers,
      },
    });
  }
  return createMCP({
    transport: new StdioMCPTransport({
      command: transport.command,
      args: transport.args ? transport.args.split(" ") : [],
    }),
  });
};

export const getMCPsForAgent = async (agentId: string) => {
  return prisma.mCPs.findMany({
    where: {
      agentId: agentId,
    },
  });
};

export const getMCPById = async (mcpId: string) => {
  return prisma.mCPs.findUnique({
    where: {
      id: mcpId,
    },
  });
};

export const addMCPToAgent = async (
  agentId: string,
  {
    name,
    type,
    connectionArgs,
  }: {
    name: string;
    type: MCPType;
    connectionArgs:
      | { command: string; args?: string }
      | { url: string; headers?: Record<string, string> };
  },
) => {
  return prisma.mCPs.create({
    data: {
      agentId: agentId,
      type: type,
      name: name,
      connectionArgs: connectionArgs,
    },
  });
};

export const removeMCPFromAgent = async (agentId: string, mcpId: string) => {
  return prisma.mCPs.delete({
    where: {
      agentId: agentId,
      id: mcpId,
    },
  });
};
