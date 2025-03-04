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
  const feedback = await prisma.feedback.findMany({
    where: {
      conversation: {
        agentId: agentId,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return { feedback };
};

const Conversations = () => {
  const { feedback } = useLoaderData<typeof loader>();
  const { agentId } = useParams();
  return (
    <div className="py-8 px-4 md:p-8 w-full">
      <h1 className="text-3xl font-bold mb-4">Feedback</h1>

      <div className="text-muted-foreground mb-6 max-w-lg">
        Captures feedback from conversations with this agent.
        <br />
        Feedback can be used to improve the agent&apos;s performance.
      </div>

      {(!feedback || feedback.length === 0) && (
        <NoDataCard description="No feedback found for this agent." />
      )}
      {feedback && feedback.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feedback</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Feedback Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Conversation ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedback.map((fb) => (
                <TableRow key={fb.id}>
                  <TableCell className="max-w-[300px] truncate">
                    {fb.feedback}
                  </TableCell>
                  <TableCell>{fb.sentiment}</TableCell>
                  <TableCell>{fb.feedbackType}</TableCell>
                  <TableCell>{dayjs(fb.createdAt).fromNow()}</TableCell>
                  <TableCell className="font-medium">
                    <Link
                      to={`/agent/${agentId}/conversations/${fb.conversationId}`}
                    >
                      {fb.conversationId}
                    </Link>
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
