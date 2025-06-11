import { prisma } from "@db/db.server";
import {
  Form,
  useLoaderData,
  useParams,
  data,
  useActionData,
  useFetcher,
  type ActionFunctionArgs,
} from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Button } from "~/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import MarkdownEdit from "~/components/markdownedit/markdownedit.client";
import { toast } from "sonner";
import NoDataCard from "~/components/ui/no-data-card";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { Loader, Repeat } from "react-feather";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Toaster } from "~/components/ui/sonner";
import { calculateTokensString } from "~/lib/llm/tokenCounter.server";
import type { ModelSettings } from "~/types/llm";
import debounce from "debounce";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";

// Add this line near the top of the file
dayjs.extend(relativeTime);

export const loader = async ({ params }: { params: { agentId: string } }) => {
  const { agentId } = params;
  const prompts = await prisma.systemPrompt.findMany({
    where: {
      key: "default",
      agentId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
  });

  return { prompts };
};

// Define a more specific type for the action's return
type ActionData = {
  success: boolean;
  intent: "calculateTokens" | "savePrompt" | "error";
  promptTokens?: number;
  error?: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");

  const agentId = formData.get("agentId") as string;
  await hasAccessHierarchical(request, PERMISSION["agent.edit_agent"], agentId);

  if (intent === "calculateTokens") {
    const prompt = formData.get("prompt") as string;
    const agentId = formData.get("agentId") as string;

    if (!prompt && typeof prompt !== "string") {
      // ensure prompt is a string, even if empty
      return data(
        {
          error: "Prompt is required for token calculation",
          success: false,
          promptTokens: 0,
          intent: "calculateTokens" as const,
        },
        { status: 400 },
      );
    }

    const agent = await prisma.agent.findUnique({
      where: {
        id: agentId,
      },
    });

    // Model can be optional for calculateTokensString if it has a default
    const promptTokens = calculateTokensString(
      prompt,
      (agent?.modelSettings as ModelSettings)?.model,
    );
    return data({
      success: true,
      promptTokens,
      intent: "calculateTokens" as const,
    });
  }
  // Existing logic for saving the prompt - now with intent: "savePrompt"
  if (intent === "savePrompt") {
    const prompt = formData.get("prompt") as string;
    if (!prompt || !agentId) {
      return data(
        {
          error: "Prompt & agentId is required",
          success: false,
          intent: "savePrompt" as const,
        },
        { status: 400 },
      );
    }

    const agent = await prisma.agent.findUnique({
      where: {
        id: agentId,
      },
    });

    if (!agent) {
      return data(
        {
          error: "Agent not found",
          success: false,
          intent: "savePrompt" as const,
        },
        { status: 400 },
      );
    }

    const promptTokens = calculateTokensString(
      // This token count is for the saved prompt
      prompt,
      (agent.modelSettings as ModelSettings)?.model,
    );

    await prisma.systemPrompt.create({
      data: {
        key: "default",
        agentId: agentId,
        prompt: prompt,
      },
    });

    return {
      success: true,
      promptTokens, // This is from the save action
      intent: "savePrompt" as const,
    };
  }

  // Fallback for unknown or missing intent
  return data(
    { error: "Invalid intent", success: false, intent: "error" as const },
    { status: 400 },
  );
};

const Prompt = () => {
  const { prompts } = useLoaderData<typeof loader>();
  const { agentId } = useParams();
  const [markdown, setMarkdown] = useState(prompts[0]?.prompt || "");
  const [editorKey, setEditorKey] = useState(0);
  const actionData = useActionData<ActionData>();
  const fetcher = useFetcher<ActionData>();
  const [tokenCount, setTokenCount] = useState<number | null>(null);

  const handleRevert = (promptText: string) => {
    setMarkdown(promptText);
    setEditorKey((prev) => prev + 1);
  };

  useEffect(() => {
    if (actionData?.intent === "savePrompt" && actionData.success) {
      toast.success("Prompt saved successfully");
    } else if (actionData?.intent === "savePrompt" && actionData.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  const { submit } = fetcher;

  // Debounced function to calculate tokens, memoized with useCallback
  const calculateTokensDebounced = useCallback(
    debounce((currentMarkdown: string, currentAgentId?: string) => {
      if (currentAgentId) {
        const formData = new FormData();
        formData.append("prompt", currentMarkdown);
        formData.append("intent", "calculateTokens");
        formData.append("agentId", currentAgentId);
        submit(formData, { method: "post" });
      }
    }, 500),
    [submit],
  );

  useEffect(() => {
    if (markdown !== undefined && agentId) {
      calculateTokensDebounced(markdown, agentId);
    }
  }, [markdown, agentId, calculateTokensDebounced]);

  useEffect(() => {
    if (fetcher.data?.intent === "calculateTokens") {
      if (fetcher.data.success) {
        setTokenCount(fetcher.data.promptTokens ?? null);
      } else if (fetcher.data.error) {
        // Display error from token calculation if any, perhaps with a toast
        console.error("Token calculation error:", fetcher.data.error);
        toast.error(`Token calculation: ${fetcher.data.error}`);
        setTokenCount(null); // Reset or indicate error
      }
    }
  }, [fetcher.data, fetcher.state]);

  const getTokenColor = (tokens: number | null): string => {
    if (tokens === null) return "bg-gray-300"; // Default or loading state
    if (tokens <= 1000) return "bg-green-500";
    if (tokens <= 1500) return "bg-yellow-500";
    return "bg-red-500";
  };

  const initialPrompt = useRef(markdown);

  return (
    <div className="py-8 px-4 md:p-8 w-full flex flex-col">
      <h1 className="text-3xl mb-4">Manage Prompt</h1>
      <div className="mb-6 text-muted-foreground">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-4 text-primary">
          <div className="bg-muted p-2 rounded-md">
            Be clear and concise: Ensure your prompt is easy to understand.
          </div>
          <div className="bg-muted p-2 rounded-md">
            Provide context: Give enough background information to guide the
            agent.
          </div>
          <div className="bg-muted p-2 rounded-md">
            Specify the desired outcome: Clearly state what you expect from the
            agent.
          </div>
          <div className="bg-muted p-2 rounded-md">
            Use proper grammar and spelling: Avoid misunderstandings by using
            correct language.
          </div>
          <div className="bg-muted p-2 rounded-md">
            Test and iterate: Continuously refine your prompts based on agent
            performance.
          </div>
        </div>
      </div>

      <div className="mb-8">
        <Form method="post" className="space-y-4">
          <div>
            <input type="hidden" name="agentId" value={agentId} />
            <input type="hidden" name="prompt" value={markdown} />
            <input type="hidden" name="intent" value="savePrompt" />
            <ClientOnlyComponent>
              {MarkdownEdit && (
                <MarkdownEdit
                  prompt={initialPrompt.current}
                  onChange={setMarkdown}
                  key={editorKey}
                />
              )}
            </ClientOnlyComponent>
          </div>
          <div className="flex justify-between items-center">
            {tokenCount !== null && (
              <div className="flex items-center">
                <p className="text-sm text-muted-foreground mr-2">
                  Token Count: {tokenCount}
                </p>
                <div
                  className={`w-3 h-3 rounded-full ${getTokenColor(tokenCount)} mr-2`}
                  title={`Token count: ${tokenCount}`}
                />
                {fetcher.state === "submitting" && (
                  <Loader className="inline-block animate-spin" size={16} />
                )}
              </div>
            )}
            <Button type="submit">Save Changes</Button>
          </div>
        </Form>
      </div>
      {(!prompts || prompts.length === 0) && (
        <NoDataCard
          headline="No Prompt History"
          description="Start by creating your first prompt!"
        />
      )}
      {prompts && prompts.length > 0 && (
        <div>
          <h2 className="text-2xl font-medium mb-4">Prompt History</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Created</TableHead>
                <TableHead className="w-full">Prompt</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell className="whitespace-nowrap">
                    {dayjs(prompt.createdAt).fromNow()}
                  </TableCell>
                  <TableCell className="max-w-xl">
                    <div className="truncate">{prompt.prompt}</div>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div onClick={() => handleRevert(prompt.prompt)}>
                            <Repeat size={16} />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Revert to this prompt</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Toaster />
    </div>
  );
};

export default Prompt;
