import { experimental_createMCPClient as createMCP } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";

import {} from "ai/mcp-stdio";

export const createMCPClient = ({
  transport,
}: {
  transport:
    | { type: "sse"; url: string; headers?: Record<string, string> }
    | { type: "stdio"; command: string; args?: string };
}) => {
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
