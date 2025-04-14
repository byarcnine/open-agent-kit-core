import {
  Link,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  useActionData,
  useNavigation,
} from "react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getPluginsForAgent } from "~/lib/plugins/availability.server";
import NoDataCard from "~/components/ui/no-data-card";
import { prisma } from "@db/db.server";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useState, useEffect } from "react";
import { Form } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { experimental_createMCPClient as createMCPClient, tool } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";

// Add this line near the top of the file
dayjs.extend(relativeTime);

// Define the possible return types for the action
type ActionResponse =
  | {
      success: true;
      error?: never;
      tools: { [key: string]: { description: string } };
    }
  | {
      success?: never;
      error: string;
    };

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const pluginsPromise = getPluginsForAgent(params.agentId as string);
  const mcpPromise = prisma.mCPs.findMany({
    where: {
      agentId: params.agentId as string,
    },
  });
  return { plugins: await pluginsPromise, mcp: await mcpPromise };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const agentId = formData.get("agentId") as string;
  const type = formData.get("type") as "SSE" | "STDIO";

  try {
    if (type === "SSE") {
      const connectionString = formData.get("connectionString") as string;
      let additionalArgs = formData.get("additionalArgs") as string;

      // Validate JSON if provided
      let parsedArgs: Record<string, any> = {};
      if (additionalArgs && additionalArgs.trim() !== "") {
        try {
          parsedArgs = JSON.parse(additionalArgs);
        } catch (error) {
          return data(
            { error: "Invalid JSON in additional arguments" },
            { status: 400 },
          );
        }
      }

      // Test the MCP connection
      try {
        const mcpClient = await createMCPClient({
          transport: {
            type: "sse",
            url: connectionString,
            headers: parsedArgs.headers || {},
          },
        });

        // Try to get tools to verify connection
        const tools = await mcpClient.tools();
        await mcpClient.close();

        // Save to database
        await prisma.mCPs.create({
          data: {
            agentId,
            type,
            connectionArgs: {
              ...(parsedArgs || {}),
              connectionString,
            },
          },
        });

        return data({
          success: true,
          tools: tools,
        });
      } catch (error) {
        return data(
          {
            error: `Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`,
          },
          { status: 400 },
        );
      }
    } else if (type === "STDIO") {
      const command = formData.get("command") as string;
      const args = formData.get("args") as string;

      // Test the MCP connection
      try {
        const mcpClient = await createMCPClient({
          transport: new StdioMCPTransport({
            command,
            args: args ? args.split(" ") : [],
          }),
        });

        // Try to get tools to verify connection
        const tools = await mcpClient.tools();
        await mcpClient.close();

        // Save to database
        await prisma.mCPs.create({
          data: {
            agentId,
            type,
            connectionArgs: {
              args,
              command,
            },
          },
        });

        return data({
          success: true,
          tools: tools,
        });
      } catch (error) {
        return data(
          {
            error: `Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`,
          },
          { status: 400 },
        );
      }
    }

    return data({ success: true });
  } catch (error) {
    console.error("Error saving MCP:", error);
    return data(
      {
        error: `Failed to save MCP: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
};

const KnowledgeProvider = () => {
  const { plugins, mcp } = useLoaderData<typeof loader>();
  const { agentId } = useParams();
  const [isOpen, setIsOpen] = useState(false);
  const [mcpType, setMcpType] = useState<"SSE" | "STDIO">("SSE");
  const actionData = useActionData<ActionResponse>();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tools, setTools] = useState<{
    [key: string]: { description: string };
  } | null>(null);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  // Reset error/success when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(false);
      setTools(null);
    }
  }, [isOpen]);

  // Set error/success based on action data
  useEffect(() => {
    if (actionData?.error) {
      setError(actionData.error);
    } else if (actionData?.success) {
      setSuccess(true);
      if (actionData.tools) {
        setTools(actionData.tools);
      }
    }
  }, [actionData]);

  return (
    <div className="w-full py-8 px-4 md:p-8">
      <h1 className="text-3xl font-bold mb-4">Plugins</h1>
      <div className="text-muted-foreground mb-6 max-w-lg">
        Plugins are used to extend the capabilities of the agent.
        <br />
        Plugins can be used to add new features, integrations, or custom logic
        to the agent.
      </div>

      {(!plugins || plugins.length === 0) && (
        <NoDataCard
          headline=""
          description="No plugins found for this agent."
        />
      )}
      {plugins && plugins.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xxl:grid-cols-4 gap-4 w-full">
          {plugins.map((plugin) => (
            <Link
              key={plugin.name}
              className="block"
              to={`/agent/${agentId}/plugins/${plugin.slug}`}
            >
              <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{plugin.displayName || plugin.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {plugin.description && (
                    <div className="text-sm text-muted-foreground mb-4">
                      {plugin.description}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">MCPs</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>Add MCP</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New MCP</DialogTitle>
              <DialogDescription>
                Configure a new Model Control Protocol connection
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div
                className="bg-destructive/15 border border-destructive text-destructive px-4 py-3 rounded-md mt-2"
                role="alert"
              >
                <span className="block sm:inline text-sm">{error}</span>
              </div>
            )}

            {success && !tools && (
              <div
                className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md mt-2"
                role="alert"
              >
                <span className="block sm:inline text-sm">
                  MCP added successfully!
                </span>
              </div>
            )}

            {success && tools ? (
              <div className="space-y-4 mt-4">
                <div
                  className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md"
                  role="alert"
                >
                  <span className="font-medium">MCP added successfully!</span>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    Available Tools: {Object.keys(tools).length}
                  </h3>
                  <div className="mt-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {Object.keys(tools).map((key: string, index) => (
                      <div
                        key={index}
                        className="py-1 border-b last:border-b-0"
                      >
                        <span className="font-medium">{key}</span>
                        {tools[key].description && (
                          <p className="text-sm text-muted-foreground">
                            {tools[key].description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={() => setIsOpen(false)}>Continue</Button>
                </DialogFooter>
              </div>
            ) : (
              <Form method="post" className="space-y-4 mt-4">
                <input type="hidden" name="agentId" value={agentId} />
                <input type="hidden" name="type" value={mcpType} />

                <Tabs
                  value={mcpType}
                  onValueChange={(value) =>
                    setMcpType(value as "SSE" | "STDIO")
                  }
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="SSE">SSE</TabsTrigger>
                    <TabsTrigger value="STDIO">STDIO</TabsTrigger>
                  </TabsList>
                  <TabsContent value="SSE">
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="connectionString">
                        Connection String
                      </Label>
                      <Input
                        id="connectionString"
                        name="connectionString"
                        placeholder="Enter connection string"
                      />
                    </div>
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="additionalArgs">
                        Additional Arguments (JSON)
                      </Label>
                      <Textarea
                        id="additionalArgs"
                        name="additionalArgs"
                        placeholder='{"key": "value"}'
                        className="font-mono"
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="STDIO">
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="command">Command</Label>
                        <Input
                          id="command"
                          name="command"
                          placeholder="Enter command"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="args">Additional Arguments</Label>
                        <Input
                          id="args"
                          name="args"
                          placeholder="Enter additional arguments"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save MCP"}
                  </Button>
                </DialogFooter>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
      {mcp && mcp.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xxl:grid-cols-4 gap-4 w-full">
          {mcp.map((mcp) => (
            <div key={mcp.id}>{mcp.id}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KnowledgeProvider;
