import {
  Link,
  Outlet,
  useLoaderData,
  useParams,
  useNavigate,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { type Conversation, type Message, prisma } from "@db/db.server";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import calendar from "dayjs/plugin/calendar";
import Layout from "~/components/layout/layout";
import { MessageCircle, PlusCircle } from "react-feather";
import { PERMISSIONS } from "~/types/auth";
import { useEffect } from "react";

// Initialize the plugins
dayjs.extend(relativeTime);
dayjs.extend(calendar);

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { agentId } = params;
  const user = await hasAccess(request, PERMISSIONS.VIEW_AGENT, agentId);
  const conversations = await prisma.conversation.findMany({
    where: {
      agentId,
      userId: user?.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 25,
    include: {
      messages: {
        take: 1,
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
  const dayGroupedConversations = conversations.reduce(
    (acc: { [key: string]: (Conversation & { messages: Message[] })[] }, c) => {
      const date = dayjs(c.createdAt).calendar(null, {
        sameDay: "[Today]",
        lastDay: "[Yesterday]",
        lastWeek: "[Last] dddd",
        sameElse: "MMM D, YYYY",
      });
      acc[date] = acc[date] || [];
      acc[date].push(c);
      return acc;
    },
    {},
  );
  const conversationsByDay = Object.keys(dayGroupedConversations).map(
    (key) => ({
      date: key,
      conversations: dayGroupedConversations[key],
    }),
  );
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
  });
  if (!agent) {
    throw new Response("Agent not found", { status: 404 });
  }
  return {
    conversationsByDay,
    user,
    agent,
  };
};

const ChatOverview = () => {
  const { agentId } = useParams();
  const { conversationsByDay, agent, user } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        navigate(`/chat/${agentId}`, { replace: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [agentId, navigate]);

  return (
    <Layout
      navComponent={
        <div className="md:px-2 text-sm font-medium">
          <Link
            className="flex items-center gap-2 rounded-md px-3 py-2 transition-all hover:text-primary bg-zinc-200 text-primary mb-8"
            to={`/chat/${agentId}`}
            reloadDocument
          >
            <PlusCircle className="h-4 w-4" />
            New Conversation
          </Link>
          <h2 className="text-muted-foreground mb-4 flex items-center gap-2 px-3 py-2 border-b">
            <MessageCircle className="h-4 w-4" />
            Chats
          </h2>
          {conversationsByDay.map(({ date, conversations }) => (
            <div className="block mb-6 px-3 overflow-auto" key={date}>
              <h2 className="text-sm mb-2 text-muted-foreground">{date}</h2>
              {conversations
                .filter((e) => e)
                .map((c) => (
                  <Link
                    className="py-2 block hover:bg-zinc-200 rounded-md px-2 text-sm text-neutral-900 font-normal"
                    to={`/chat/${agentId}/${c.id}`}
                    key={c.id}
                  >
                    {c.tagline}
                  </Link>
                ))}
            </div>
          ))}
        </div>
      }
      user={user}
      agentName={agent?.name}
    >
      <Outlet />
    </Layout>
  );
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [
    { title: `OAK - ${data?.agent.name}` },
    { name: "description", content: "Open Agent Kit" },
  ];
};

export default ChatOverview;
