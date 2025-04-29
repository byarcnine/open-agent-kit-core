import { prisma } from "@db/db.server";
import {
  Form,
  useLoaderData,
  useParams,
  data,
  useActionData,
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
import { useState, useEffect } from "react";
import MarkdownEdit from "~/components/markdownedit/markdownedit.client";
import { toast } from "sonner";
import NoDataCard from "~/components/ui/no-data-card";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { Repeat } from "react-feather";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Toaster } from "~/components/ui/sonner";

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

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const prompt = formData.get("prompt") as string;
  const agentId = formData.get("agentId") as string;
  if (!prompt || !agentId) {
    return data({ error: "Prompt & agentId is required" }, { status: 400 });
  }

  await prisma.systemPrompt.create({
    data: {
      key: "default", // this can be extended later to support multiple prompts per agent instance
      agentId: agentId,
      prompt: prompt,
    },
  });

  return true;
};

const Prompt = () => {
  const { prompts } = useLoaderData<typeof loader>();
  const { agentId } = useParams();
  const [markdown, setMarkdown] = useState(prompts[0]?.prompt);
  const [editorKey, setEditorKey] = useState(0);
  const actionData = useActionData<typeof action>();
  const handleRevert = (promptText: string) => {
    setMarkdown(promptText);
    setEditorKey((prev) => prev + 1);
  };

  useEffect(() => {
    if (actionData === true) {
      toast.success("Prompt saved successfully");
    }
  }, [actionData]);

  return (
    <div className="py-8 px-4 md:p-8 w-full flex flex-col">
      <h1 className="text-3xl mb-4">System Prompt Editor</h1>
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
            <ClientOnlyComponent>
              {MarkdownEdit && (
                <MarkdownEdit
                  prompt={markdown}
                  onChange={setMarkdown}
                  key={editorKey}
                />
              )}
            </ClientOnlyComponent>
          </div>
          <div className="flex justify-end">
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
