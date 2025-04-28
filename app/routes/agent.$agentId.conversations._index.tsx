import { prisma } from "@db/db.server";
import {
  Link,
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
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

// Add this line near the top of the file
dayjs.extend(relativeTime);

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    where: {
      agentId: agentId,
    },
    select: {
      id: true,
      customIdentifier: true,
      createdAt: true,
      updatedAt: true,
      tagline: true,
    },
  });
  return { conversations };
};

const Conversations = () => {
  const { conversations } = useLoaderData<typeof loader>();
  const { agentId } = useParams();
  return (
    <div className="py-8 px-4 md:p-8 w-full">
      <h1 className="text-3xl font-medium mb-8">Agent Conversations</h1>

      {(!conversations || conversations.length === 0) && (
        <NoDataCard description="No conversations found for this agent." />
      )}
      {conversations && conversations.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Custom Id</TableHead>
                <TableHead>Initial Message</TableHead>
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
                    {dayjs(conversation.createdAt).fromNow()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Conversations;
