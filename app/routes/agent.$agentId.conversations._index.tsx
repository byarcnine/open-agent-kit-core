import { prisma, type Conversation } from "@db/db.server";
import {
  Link,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
  useFetcher,
  useSearchParams,
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
import NoDataCard from "~/components/ui/no-data-card";
import { useState, useEffect } from "react";
import Checkbox from "~/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "~/components/ui/pagination";

// Add this line near the top of the file
dayjs.extend(relativeTime);

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const url = new URL(request.url);
  const showArchivedQueryParam =
    url.searchParams.get("showArchived") === "true";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 25; // Or make this configurable
  const skip = (page - 1) * pageSize;

  const where = {
    agentId: agentId,
    archived: showArchivedQueryParam,
  };

  const [totalCount, conversations] = await prisma.$transaction([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      where,
      select: {
        id: true,
        customIdentifier: true,
        createdAt: true,
        updatedAt: true,
        tagline: true,
        userId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    conversations,
    totalCount,
    currentPage: page,
    pageSize,
    showArchivedQueryParam,
  };
};

const Conversations = () => {
  const initialLoaderData = useLoaderData<typeof loader>();
  const { agentId } = useParams();
  const fetcher = useFetcher<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize showArchived from URL or default to false
  const [showArchived, setShowArchived] = useState(
    initialLoaderData.showArchivedQueryParam || false,
  );

  // Effect to update showArchived state when loader data (from fetcher or initial load) changes
  useEffect(() => {
    const currentShowArchivedParam =
      fetcher.data?.showArchivedQueryParam ??
      initialLoaderData.showArchivedQueryParam;
    if (currentShowArchivedParam !== undefined) {
      setShowArchived(currentShowArchivedParam);
    }
  }, [
    fetcher.data?.showArchivedQueryParam,
    initialLoaderData.showArchivedQueryParam,
  ]);

  const handleCheckboxChange = () => {
    const newShowArchived = !showArchived;
    // No need to call setShowArchived here, it will be updated by the useEffect
    // when fetcher.data changes or if we decide to update it optimistically.

    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("showArchived", String(newShowArchived));
    newSearchParams.set("page", "1"); // Reset to page 1 when filter changes
    fetcher.load(
      `/agent/${agentId}/conversations?${newSearchParams.toString()}`,
    );
  };

  const currentData = fetcher.data || initialLoaderData;
  const { conversations, totalCount, currentPage, pageSize } = currentData;

  const totalPages = Math.ceil(totalCount / pageSize);

  const getPageUrl = (pageNumber: number) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("page", pageNumber.toString());
    // Ensure showArchived status is preserved in pagination links
    newSearchParams.set("showArchived", String(showArchived));
    return `?${newSearchParams.toString()}`;
  };

  // --- Calculate pagination range (copied from DocumentsTab) ---
  const pagesToShow = 2;
  let startPage = Math.max(1, currentPage - pagesToShow);
  let endPage = Math.min(totalPages, currentPage + pagesToShow);

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
    <div className="py-8 px-4 md:p-8 w-full">
      <h1 className="text-3xl font-medium mb-8">Agent Conversations</h1>

      <div className="mb-4 text-sm flex justify-end">
        <Checkbox
          checked={showArchived}
          onCheckedChange={handleCheckboxChange}
          label="Show Archived"
        />
      </div>

      {(!conversations || conversations.length === 0) && (
        <NoDataCard description="No conversations found for this agent." />
      )}
      {conversations && conversations.length > 0 && (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Custom Id</TableHead>
                  <TableHead>Initial Message</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/agent/${agentId}/conversations/${conversation.id}`}
                      >
                        {conversation.id}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {conversation.customIdentifier || "-"}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {conversation.tagline}
                    </TableCell>
                    <TableCell>
                      {conversation.user?.email || "Anonymous"}
                    </TableCell>
                    <TableCell>
                      {dayjs(conversation.createdAt).fromNow()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      to={getPageUrl(currentPage - 1)}
                      preventScrollReset
                      prefetch="intent"
                      className={
                        currentPage <= 1
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      aria-disabled={currentPage <= 1}
                      tabIndex={currentPage <= 1 ? -1 : undefined}
                    />
                  </PaginationItem>

                  {startPage > 1 && (
                    <>
                      <PaginationItem>
                        <PaginationLink
                          to={getPageUrl(1)}
                          preventScrollReset
                          prefetch="intent"
                          isActive={currentPage === 1}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      {startPage > 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                    </>
                  )}

                  {pageNumbers.map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        to={getPageUrl(page)}
                        preventScrollReset
                        prefetch="intent"
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  {endPage < totalPages && (
                    <>
                      {endPage < totalPages - 1 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          to={getPageUrl(totalPages)}
                          preventScrollReset
                          prefetch="intent"
                          isActive={currentPage === totalPages}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}

                  <PaginationItem>
                    <PaginationNext
                      to={getPageUrl(currentPage + 1)}
                      preventScrollReset
                      prefetch="intent"
                      className={
                        currentPage >= totalPages
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      aria-disabled={currentPage >= totalPages}
                      tabIndex={currentPage >= totalPages ? -1 : undefined}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Conversations;
