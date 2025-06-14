import {
  data,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
  useFetcher,
  type ActionFunctionArgs,
} from "react-router";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import Dropzone from "~/components/dropzone/dropzone.client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Trash2, Check, X, Edit, PlusSquare } from "react-feather";
import { parseFile } from "~/lib/knowledge/parseFile.server";
import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";
import { prisma } from "@db/db.server";
import { createKnowledgeDocumentFromText } from "~/lib/knowledge/embedding.server";
import { sessionStorage } from "~/lib/sessions.server";
import * as Popover from "@radix-ui/react-popover";
import { Button } from "~/components/ui/button";
import JsonEditorDialog from "~/components/jsonEditorDialog/jsonEditorDialog";
import React from "react";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import { PERMISSIONS } from "~/types/auth";
import { PaginationBlock } from "~/components/paginationBlock/paginationBlock";

dayjs.extend(relativeTime);

enum Intent {
  DELETE = "delete",
  ADD_TAG = "addTag",
  REMOVE_TAG = "removeTag",
  UPDATE_METADATA = "UPDATE_METADATA",
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const agentId = params.agentId as string;
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  await hasAccess(request, PERMISSIONS.EDIT_AGENT, agentId);
  try {
    const clonedRequest = request.clone();

    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === Intent.DELETE) {
      const documentId = formData.get("documentId") as string;
      await prisma.knowledgeDocument.delete({
        where: { id: documentId },
      });

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
        },
      );
    } else if (intent === Intent.ADD_TAG) {
      const documentId = formData.get("documentId") as string;
      const tagId = formData.get("tagId") as string;
      await prisma.knowledgeDocumentTag.update({
        where: { id: tagId },
        data: { documents: { connect: { id: documentId } } },
      });

      return data(
        { success: true },
        {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        },
      );
    } else if (intent === Intent.REMOVE_TAG) {
      const documentId = formData.get("documentId") as string;
      const tagId = formData.get("tagId") as string;
      await prisma.knowledgeDocumentTag.update({
        where: { id: tagId },
        data: { documents: { disconnect: { id: documentId } } },
      });

      return data(
        { success: true },
        {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        },
      );
    } else if (intent === Intent.UPDATE_METADATA) {
      const documentId = formData.get("documentId") as string;
      const metadata = formData.get("metadata") as string;
      await prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { metadata: JSON.parse(metadata) },
      });

      return data(
        { success: true },
        {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        },
      );
    }
    const uploadHandler = async (fileUpload: FileUpload) => {
      const buffer = await fileUpload
        .arrayBuffer()
        .then((ab) => Buffer.from(ab));
      const parsed = await parseFile(buffer, fileUpload.name);
      await createKnowledgeDocumentFromText(
        parsed.content,
        agentId,
        fileUpload.name,
      );
    };

    await parseFormData(clonedRequest, uploadHandler);
    session.flash("message", {
      heading: "File uploaded successfully",
      type: "success",
    });
    return data(
      { success: true },
      {
        headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      console.log("error instanceof Error", error.message);
      session.flash("message", {
        heading: error.message,
        type: "error",
      });
    } else {
      session.flash("message", {
        heading: "Failed to upload",
        type: "error",
      });
    }
    return data(
      { success: false },
      {
        headers: { "Set-Cookie": await sessionStorage.commitSession(session) },
      },
    );
  }
};

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const url = new URL(request.url);
  const sortKey = url.searchParams.get("sortField") || "name";
  const sortOrder = url.searchParams.get("sortOrder") || "asc";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 25;
  const skip = (page - 1) * pageSize;

  const where = { agentId };

  const [totalCount, files] = await prisma.$transaction([
    prisma.knowledgeDocument.count({ where }),
    prisma.knowledgeDocument.findMany({
      where,
      include: { tags: true },
      orderBy: { [sortKey]: sortOrder },
      skip,
      take: pageSize,
    }),
  ]);

  const tags = await prisma.knowledgeDocumentTag.findMany({
    where: { agentId },
    orderBy: { name: "asc" },
  });

  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  const message = session.get("message");
  return data(
    {
      files,
      message,
      tags,
      totalCount,
      currentPage: page,
      pageSize,
    },
    {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    },
  );
};

const DocumentsTab = () => {
  const loaderData = useLoaderData<typeof loader>();
  const {
    files = [],
    message,
    tags = [],
    totalCount = 0,
    currentPage = 1,
    pageSize = 25,
  } = loaderData;
  const { agentId } = useParams();
  useEffect(() => {
    if (message) {
      if (message.type === "success") {
        toast.success(message.heading);
      } else {
        toast.error(message.heading, {
          duration: 8000,
        });
      }
    }
  }, [message]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // --- Calculate pagination range ---
  const pagesToShow = 2; // Number of pages to show on each side of the current page
  let startPage = Math.max(1, currentPage - pagesToShow);
  let endPage = Math.min(totalPages, currentPage + pagesToShow);

  // Adjust range if it's too small near the beginning or end
  if (currentPage - pagesToShow <= 1) {
    endPage = Math.min(totalPages, 1 + pagesToShow * 2);
  }
  if (currentPage + pagesToShow >= totalPages) {
    startPage = Math.max(1, totalPages - pagesToShow * 2);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  // --- End calculation ---

  return (
    <div>
      <div className="h-[150px]">
        <ClientOnlyComponent>
          {Dropzone && <Dropzone agentId={agentId as string} />}
        </ClientOnlyComponent>
      </div>
      {files.length > 0 ? (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead isSortable fieldName="name">
                    Name
                  </TableHead>
                  <TableHead fieldName="updatedAt" isSortable>
                    Last Modified
                  </TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Metadata</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file: any) => (
                  <DocumentRow key={file.id} file={file} tags={tags} />
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBlock
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
          />
        </>
      ) : (
        !message && (
          <p className="text-center text-gray-500 mt-4">No documents found.</p>
        )
      )}
      <Toaster expand={true} />
    </div>
  );
};

const DocumentRow = ({ file, tags }: { file: any; tags: any[] }) => {
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [metadata, setMetadata] = useState(file.metadata || {});
  const fetcher = useFetcher();
  const handleEditClick = () => {
    setIsEditingMetadata(true);
  };

  const handleMetadataSave = (updatedMetadata: any) => {
    setMetadata(updatedMetadata);
    setIsEditingMetadata(false);

    fetcher.submit(
      {
        intent: Intent.UPDATE_METADATA,
        documentId: file.id,
        metadata: JSON.stringify(updatedMetadata),
      },
      {
        method: "POST",
      },
    );
  };

  return (
    <TableRow key={file.id}>
      <TableCell className="font-medium">{file.name}</TableCell>
      <TableCell className="min-w-[130px] max-w-[300px] truncate">
        {dayjs(file.updatedAt).fromNow()}
      </TableCell>
      <TableCell className="max-w-[300px] truncate">{file.provider}</TableCell>
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
      <TableCell className="max-w-[300px] truncate">
        <div className="flex flex-wrap gap-1">
          {file.tags?.map((tag: any) => (
            <Tag
              key={tag.id}
              intent={Intent.REMOVE_TAG}
              documentId={file.id}
              tagId={tag.id}
              tagName={tag.name}
              tagColor={tag.color}
            />
          ))}
          <TagPopover file={file} tags={tags} />
        </div>
      </TableCell>
      <TableCell>
        {isEditingMetadata ? (
          <JsonEditorDialog
            data={metadata}
            onSave={handleMetadataSave}
            onClose={() => setIsEditingMetadata(false)}
            isOpen={isEditingMetadata}
          />
        ) : (
          <div className="flex items-center">
            <button
              className="text-gray-700 hover:text-black"
              onClick={handleEditClick}
            >
              {file.metadata ? (
                <Edit className="w-4 h-4" />
              ) : (
                <PlusSquare className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </TableCell>
      <TableCell>
        {file.provider === "default" && <DeleteForm documentId={file.id} />}
      </TableCell>
    </TableRow>
  );
};

const Tag = ({
  intent,
  documentId,
  tagId,
  tagName,
  tagColor,
}: {
  intent: Intent;
  documentId: string;
  tagId: string;
  tagName: string;
  tagColor: string;
}) => {
  const fetcher = useFetcher();

  const handleTagAction = () => {
    fetcher.submit(
      {
        intent,
        documentId,
        tagId,
      },
      {
        method: "POST",
      },
    );
  };

  return (
    <div className="ml-1 flex items-center">
      <button type="button" onClick={handleTagAction}>
        <Badge
          variant="secondary"
          className="mr-1 text-black font-medium flex items-center"
          style={{ backgroundColor: tagColor }}
        >
          {tagName}
          <X className="w-3 h-3 ml-1" />
        </Badge>
      </button>
    </div>
  );
};

const TagPopover = React.memo(({ file, tags }: { file: any; tags: any[] }) => {
  const fetcher = useFetcher();
  const { agentId } = useParams();

  const handleTagAction = (isSelected: boolean, tagId: string) => {
    fetcher.submit(
      {
        intent: isSelected ? Intent.REMOVE_TAG : Intent.ADD_TAG,
        documentId: file.id,
        tagId,
      },
      {
        method: "POST",
      },
    );
  };

  return (
    <Popover.Root>
      <Popover.Anchor asChild>
        <span />
      </Popover.Anchor>
      <Popover.Trigger asChild>
        <Button
          variant="link"
          className="p-0 gap-0 text-gray-700 hover:text-black"
        >
          <PlusSquare className="w-3 h-3" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="end"
          sideOffset={4}
          className="p-2 bg-white rounded-md border w-60 max-h-[300px] overflow-y-auto"
        >
          <div className="flex flex-col space-y-1">
            {tags.length > 0 ? (
              tags.map((tag: any) => {
                const isSelected = file.tags.some(
                  (fileTag: any) => fileTag.id === tag.id,
                );
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagAction(isSelected, tag.id)}
                    className="text-left p-1 hover:bg-gray-100 rounded flex items-center w-full min-w-0"
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2 shrink-0"
                      style={{ backgroundColor: tag.color }}
                    ></span>
                    <span className="text-wrap break-words truncate min-w-0">
                      {tag.name}
                    </span>
                    {isSelected && (
                      <Check className="ml-2 w-4 h-4 text-green-500 shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <a
                href={`/agent/${agentId}/knowledge/settings`}
                className="text-sm p-1 hover:bg-gray-100 rounded flex items-center w-full"
              >
                <PlusSquare className="w-4 h-4 mr-2 shrink-0" />
                <span className="whitespace-nowrap">Add Tag in Settings</span>
              </a>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});

const DeleteForm = ({ documentId }: { documentId: string }) => {
  const fetcher = useFetcher();

  const handleDelete = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      e.preventDefault();
      return;
    }
    fetcher.submit(
      {
        intent: Intent.DELETE,
        documentId,
      },
      {
        method: "POST",
      },
    );
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        className="text-red-500 hover:text-red-700"
        onClick={handleDelete}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default DocumentsTab;
