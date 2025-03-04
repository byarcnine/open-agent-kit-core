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
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import Dropzone from "~/components/dropzone/dropzone.client";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Toaster, toast } from "sonner";
import { useEffect } from "react";
import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";

dayjs.extend(relativeTime);
import { sessionStorage } from "~/lib/sessions.server";
import { prisma } from "@db/db.server";
import {
  type ActionFunctionArgs,
  data,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
} from "react-router";
import { parseFile } from "~/lib/knowledge/parseFile.sever";
import { createKnowledgeDocumentFromText } from "~/lib/knowledge/embedding.server";
import { Trash2 } from "react-feather";
import NoDataCard from "~/components/ui/no-data-card";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const agentId = params.agentId as string;
  const clonedRequest = request.clone();

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "delete") {
    const documentId = formData.get("documentId") as string;
    await prisma.knowledgeDocument.delete({
      where: { id: documentId },
    });

    const session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );
    session.flash("message", {
      heading: "Document deleted successfully",
      type: "success",
    });

    return data(
      { success: true },
      {
        headers: {
          "Set-Cookie": await sessionStorage.commitSession(session),
        },
      }
    );
  }

  const uploadHandler = async (fileUpload: FileUpload) => {
    const buffer = await fileUpload.arrayBuffer().then((ab) => Buffer.from(ab));
    const parsed = await parseFile(buffer, fileUpload.name);
    await createKnowledgeDocumentFromText(
      parsed.content,
      agentId,
      fileUpload.name
    );
  };

  await parseFormData(clonedRequest, uploadHandler);
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );

  session.flash("message", {
    heading: "File uploaded successfully",
    type: "success",
  });

  return data(
    { success: true },
    {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    }
  );
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const files = await prisma.knowledgeDocument.findMany({
    where: { agentId },
  });
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const message = session.get("message");

  return data(
    { files, message },
    {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    }
  );
};

const KnowledgeBaseView = () => {
  const loaderData = useLoaderData<typeof loader>();
  const { files = [], message } = loaderData;
  const { agentId } = useParams();

  useEffect(() => {
    if (message) {
      toast.success(message.heading);
    }
  }, [message]);

  return (
    <div className="p-6 w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight my-8">Knowledge</h1>
        {/* <Form method="post">
            <input type="hidden" name="agentId" value={agentId as string} />
            <input type="hidden" name="_action" value="sync_knowledge_base" />
            <Button variant="default">Sync Now</Button>
          </Form> */}
      </div>
      <ClientOnlyComponent>
        {Dropzone && <Dropzone agentId={agentId as string} />}
      </ClientOnlyComponent>
      {files.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.name}>
                  <TableCell className="font-medium">{file.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {dayjs(file.updatedAt).fromNow()}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {file.provider}
                  </TableCell>
                  <TableCell className="font-medium">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge
                            className={cn({
                              "bg-orange-300": file.status === "PENDING",
                              "bg-blue-300": file.status === "EMBEDDING",
                              "bg-green-300": file.status === "COMPLETED",
                            })}
                          >
                            {file.status
                              .replace("COMPLETED", "READY")
                              .replace("EMBEDDING", "PROCESSING")}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {file.status === "PENDING" &&
                              "Document uploaded and waiting to be processed. It may take up to 15 minutes to complete."}
                            {file.status === "EMBEDDING" &&
                              "Creating AI-readable embeddings from your document"}
                            {file.status === "COMPLETED" &&
                              "Document processed and ready for AI to use"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    {file.provider === "default" && (
                      <form className="flex items-center" method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input
                          type="hidden"
                          name="documentId"
                          value={file.id}
                        />
                        <button
                          type="submit"
                          className="text-red-500 hover:text-red-700"
                          onClick={(e) => {
                            if (
                              !confirm(
                                "Are you sure you want to delete this document?"
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {/* {files.length === 0 && (
        <NoDataCard
          headline="No documents found"
          description="Upload a document to get started."
        />
      )} */}
      <Toaster expand={true} />
    </div>
  );
};

export default KnowledgeBaseView;
