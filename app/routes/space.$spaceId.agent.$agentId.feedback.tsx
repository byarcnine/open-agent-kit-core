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
import type { AgentSettings } from "~/types/agentSetting";
import Warning from "~/components/ui/warning";

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

  // get the agent settings
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  const agentSettings: AgentSettings = agent?.agentSettings
    ? JSON.parse(agent.agentSettings as string)
    : null;

  return { feedback, agentSettings };
};

const Conversations = () => {
  const { feedback, agentSettings } = useLoaderData<typeof loader>();
  const { captureFeedback } = agentSettings || {};
  const { agentId, spaceId } = useParams();
  return (
    <div className="py-8 px-4 md:p-8 w-full">
      <h1 className="text-3xl font-medium mb-4">Feedback</h1>

      {!captureFeedback && (
        <Warning
          className="mb-4"
          headline="Note"
          description="To capture more feedback, please enable the 'Capture Feedback' option in the agent settings."
        />
      )}

      {(!feedback || feedback.length === 0) && (
        <NoDataCard
          headline="No feedback found"
          description={
            captureFeedback
              ? "There is no feedback available for this agent yet."
              : "Feedback capture is disabled for this agent. Please enable it in the agent settings to start collecting feedback."
          }
        />
      )}
      {feedback && feedback.length > 0 && (
        <div className="rounded-xl border">
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
                      to={`/space/${spaceId}/agent/${agentId}/conversations/${fb.conversationId}`}
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
