import {
  Link,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  data,
  useActionData,
  useNavigation,
  useFetcher,
} from "react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Loader } from "react-feather";

// Add this line near the top of the file
dayjs.extend(relativeTime);

// Define the possible return types for the action
type AddMcpResponse =
  | {
      _action: "addMcp";
      success: true;
      error?: never;
      tools: { [key: string]: { description: string } };
    }
  | {
      _action: "addMcp";
      success?: never;
      error: string;
      tools?: never;
    };

type FetchToolsResponse =
  | {
      _action: "fetchTools";
      success: true;
      error?: never;
      tools: { [key: string]: { description: string } };
    }
  | {
      _action: "fetchTools";
      success?: never;
      error: string;
      tools?: never;
    };

type ActionResponse = AddMcpResponse | FetchToolsResponse;

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const pluginsPromise = getPluginsForAgent(params.agentId as string);
  const mcpPromise = prisma.mCPs.findMany({
    where: {
      agentId: params.agentId as string,
    },
    select: {
      id: true,
      name: true,
      type: true,
      connectionArgs: true,
      agentId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return { plugins: await pluginsPromise, mcp: await mcpPromise };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const formAction = formData.get("_action") as "addMcp" | "fetchTools";

  if (formAction === "fetchTools") {
    const mcpId = formData.get("mcpId") as string;
    if (!mcpId) {
      return data(
        { _action: "fetchTools", error: "MCP ID is required" },
        { status: 400 },
      );
    }

    try {
      const mcp = await prisma.mCPs.findUnique({ where: { id: mcpId } });
      if (!mcp) {
        return data(
          { _action: "fetchTools", error: "MCP not found" },
          { status: 404 },
        );
      }

      let mcpClient;
      const connectionArgs = mcp.connectionArgs as any; // Type assertion might be needed

      if (mcp.type === "SSE") {
        mcpClient = await createMCPClient({
          transport: {
            type: "sse",
            url: connectionArgs.connectionString,
            headers: connectionArgs.headers || {},
          },
        });
      } else if (mcp.type === "STDIO") {
        mcpClient = await createMCPClient({
          transport: new StdioMCPTransport({
            command: connectionArgs.command,
            args: connectionArgs.args ? connectionArgs.args.split(" ") : [],
          }),
        });
      } else {
        return data(
          { _action: "fetchTools", error: "Unsupported MCP type" },
          { status: 400 },
        );
      }

      const tools = await mcpClient.tools();
      await mcpClient.close();

      return data({ _action: "fetchTools", success: true, tools: tools });
    } catch (error) {
      console.error("Error fetching MCP tools:", error);
      return data(
        {
          _action: "fetchTools",
          error: `Failed to fetch tools: ${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 500 },
      );
    }
  }

  // --- Existing Add MCP Logic ---
  const agentId = formData.get("agentId") as string;
  const type = formData.get("type") as "SSE" | "STDIO";
  const name = formData.get("name") as string;

  if (!name || name.trim() === "") {
    return data(
      { _action: "addMcp", error: "MCP Name is required" },
      { status: 400 },
    );
  }

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
            {
              _action: "addMcp",
              error: "Invalid JSON in additional arguments",
            },
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
            name,
            connectionArgs: {
              ...(parsedArgs || {}),
              connectionString,
            },
          },
        });

        return data({
          _action: "addMcp",
          success: true,
          tools: tools,
        });
      } catch (error) {
        return data(
          {
            _action: "addMcp",
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
            name,
            connectionArgs: {
              args,
              command,
            },
          },
        });

        return data({
          _action: "addMcp",
          success: true,
          tools: tools,
        });
      } catch (error) {
        return data(
          {
            _action: "addMcp",
            error: `Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`,
          },
          { status: 400 },
        );
      }
    }

    // This part might be unreachable now, but keep for safety or refactor
    // return data({ _action: 'addMcp', success: true });
  } catch (error) {
    console.error("Error saving MCP:", error);
    return data(
      {
        _action: "addMcp",
        error: `Failed to save MCP: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
  // Add a default return for the case where no type matches, although TS should prevent this
  return data(
    { _action: "addMcp", error: "Invalid MCP type specified" },
    { status: 400 },
  );
};

const KnowledgeProvider = () => {
  const { plugins, mcp: initialMcpList } = useLoaderData<typeof loader>();
  const { agentId } = useParams();
  const [isAddMcpOpen, setIsAddMcpOpen] = useState(false);
  const [mcpType, setMcpType] = useState<"SSE" | "STDIO">("SSE");
  const actionData = useActionData<ActionResponse>();
  const [addMcpError, setAddMcpError] = useState<string | null>(null);
  const [addMcpSuccess, setAddMcpSuccess] = useState(false);
  const [addedTools, setAddedTools] = useState<{
    [key: string]: { description: string };
  } | null>(null);
  const navigation = useNavigation();
  const isSubmittingAddMcp =
    navigation.state === "submitting" &&
    navigation.formData?.get("_action") === "addMcp";

  // State for Tool Details Modal
  const [toolModalOpen, setToolModalOpen] = useState(false);
  const [selectedMcp, setSelectedMcp] = useState<{
    id: string;
    type: string;
    name?: string;
  } | null>(null);
  const fetcher = useFetcher<FetchToolsResponse>(); // Fetcher for tools

  // Reset add MCP dialog state when it opens/closes
  useEffect(() => {
    if (!isAddMcpOpen) {
      setAddMcpError(null);
      setAddMcpSuccess(false);
      setAddedTools(null);
      setMcpType("SSE"); // Reset tab selection
    }
  }, [isAddMcpOpen]);

  // Handle response from adding an MCP
  useEffect(() => {
    if (actionData?._action === "addMcp") {
      if (actionData.error) {
        setAddMcpError(actionData.error);
        setAddMcpSuccess(false);
        setAddedTools(null);
      } else if (actionData.success) {
        setAddMcpError(null);
        setAddMcpSuccess(true);
        if (actionData.tools) {
          setAddedTools(actionData.tools);
        }
        // Optionally close the dialog automatically on success after a delay
        // setTimeout(() => setIsAddMcpOpen(false), 2000);
      }
    }
  }, [actionData]);

  // Reset fetcher state when tool modal closes
  useEffect(() => {
    if (!toolModalOpen) {
      setSelectedMcp(null);
      // Reset fetcher if needed, though it usually resets on new submissions
    }
  }, [toolModalOpen]);

  const handleViewTools = (mcp: {
    id: string;
    type: string;
    name?: string;
  }) => {
    setSelectedMcp(mcp);
    setToolModalOpen(true);
    // Submit using the fetcher
    fetcher.submit(
      { _action: "fetchTools", mcpId: mcp.id },
      { method: "post" },
    );
  };

  // Determine the current list of MCPs (initial + newly added if any)
  // Note: This simple approach won't reflect additions in real-time without page reload
  // For real-time updates, you'd need more complex state management or revalidation.
  const mcpList = initialMcpList;

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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">MCPs</h2>
          <Dialog open={isAddMcpOpen} onOpenChange={setIsAddMcpOpen}>
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

              {addMcpError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{addMcpError}</AlertDescription>
                </Alert>
              )}

              {addMcpSuccess && !addedTools && (
                <Alert className="mt-2">
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>MCP added successfully!</AlertDescription>
                </Alert>
              )}

              {addMcpSuccess && addedTools ? (
                <div className="space-y-4 mt-4">
                  <Alert>
                    <AlertTitle>Success!</AlertTitle>
                    <AlertDescription>MCP added successfully!</AlertDescription>
                  </Alert>

                  <div className="mt-4">
                    <h3 className="text-lg font-medium">
                      Available Tools: {Object.keys(addedTools).length}
                    </h3>
                    <div className="mt-2 max-h-60 overflow-y-auto border rounded-md p-3">
                      {Object.keys(addedTools).map((key: string, index) => (
                        <div
                          key={index}
                          className="py-1 border-b last:border-b-0"
                        >
                          <span className="font-medium">{key}</span>
                          {addedTools[key].description && (
                            <p className="text-sm text-muted-foreground">
                              {addedTools[key].description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={() => setIsAddMcpOpen(false)}>
                      Continue
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <Form method="post" className="space-y-4 mt-4">
                  <input type="hidden" name="_action" value="addMcp" />
                  <input type="hidden" name="agentId" value={agentId} />
                  <input type="hidden" name="type" value={mcpType} />

                  <div className="space-y-2">
                    <Label htmlFor="mcpName">Name</Label>
                    <Input
                      id="mcpName"
                      name="name"
                      placeholder="My Custom MCP"
                      required
                    />
                  </div>

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
                          placeholder="http://localhost:8080/mcp"
                          required
                        />
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="additionalArgs">
                          Additional Arguments (JSON)
                        </Label>
                        <Textarea
                          id="additionalArgs"
                          name="additionalArgs"
                          placeholder='{ "headers": {"Authorization": "Bearer ..." } }'
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
                            placeholder="python"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="args">
                            Arguments (space-separated)
                          </Label>
                          <Input
                            id="args"
                            name="args"
                            placeholder="mcp_server.py --port 8001"
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <DialogFooter>
                    <Button type="submit" disabled={isSubmittingAddMcp}>
                      {isSubmittingAddMcp ? (
                        <>
                          <Loader className="mr-2 h-4 w-4 animate-spin" />{" "}
                          Saving...
                        </>
                      ) : (
                        "Save MCP"
                      )}
                    </Button>
                  </DialogFooter>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {(!mcpList || mcpList.length === 0) && (
          <NoDataCard
            headline=""
            description="No MCP connections found for this agent."
          />
        )}
        {mcpList && mcpList.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {mcpList.map((mcp) => (
              <Card key={mcp.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {mcp.name || `MCP: ${mcp.type}`}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Type: {mcp.type}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ID: {mcp.id.substring(0, 8)}...
                  </p>
                </CardHeader>
                <CardContent className="flex-grow">
                  {mcp.type === "SSE" && (
                    <p className="text-sm">
                      URL:{" "}
                      {(mcp.connectionArgs as any)?.connectionString || "N/A"}
                    </p>
                  )}
                  {mcp.type === "STDIO" && (
                    <p className="text-sm">
                      Command: {(mcp.connectionArgs as any)?.command || "N/A"}
                    </p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTools(mcp)}
                    disabled={
                      fetcher.state !== "idle" && selectedMcp?.id === mcp.id
                    }
                  >
                    {fetcher.state !== "idle" && selectedMcp?.id === mcp.id ? (
                      <>
                        <Loader className="mr-2 h-4 w-4 animate-spin" />{" "}
                        Loading...
                      </>
                    ) : (
                      "View Tools"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={toolModalOpen} onOpenChange={setToolModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Available Tools for{" "}
              {selectedMcp?.name || `MCP ${selectedMcp?.type}`}
            </DialogTitle>
            <DialogDescription>
              Tools available via MCP {selectedMcp?.type} (ID:{" "}
              {selectedMcp?.id?.substring(0, 8)}...)
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto p-1">
            {fetcher.state === "submitting" || fetcher.state === "loading" ? (
              <div className="flex justify-center items-center p-8">
                <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : fetcher.data?._action === "fetchTools" && fetcher.data.error ? (
              <Alert variant="destructive">
                <AlertTitle>Error Fetching Tools</AlertTitle>
                <AlertDescription>{fetcher.data.error}</AlertDescription>
              </Alert>
            ) : fetcher.data?._action === "fetchTools" &&
              fetcher.data.success ? (
              Object.keys(fetcher.data.tools).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(fetcher.data.tools).map(([key, tool]) => (
                    <div key={key} className="border rounded-md p-3">
                      <p className="font-medium">{key}</p>
                      {tool.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {tool.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground p-4">
                  No tools reported by this MCP.
                </p>
              )
            ) : (
              <p className="text-center text-muted-foreground p-4">
                Click "View Tools" on an MCP card to load tools.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToolModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeProvider;
