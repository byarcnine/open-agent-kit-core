import { prisma } from "@db/db.server";
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
import { PaginationBlock } from "~/components/paginationBlock/paginationBlock";

dayjs.extend(relativeTime);

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const url = new URL(request.url);
  const showArchivedQueryParam =
    url.searchParams.get("showArchived") === "true";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 25;
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
  const [searchParams] = useSearchParams();

  // Initialize showArchived from URL or default to false
  const [showArchived, setShowArchived] = useState(
    initialLoaderData.showArchivedQueryParam || false,
  );

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

    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("showArchived", String(newShowArchived));
    newSearchParams.set("page", "1"); // Reset to page 1 when filter changes
    fetcher.load(
      `/agent/${agentId}/conversations?${newSearchParams.toString()}`,
    );
  };

  const currentData = fetcher.data || initialLoaderData;
  const { conversations, totalCount, currentPage, pageSize } = currentData;

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
          <div className="rounded-xl border">
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
          <PaginationBlock
            currentPage={currentPage}
            totalCount={totalCount}
            pageSize={pageSize}
          />
        </>
      )}
    </div>
  );
};

export default Conversations;
