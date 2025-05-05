import {
  Link,
  Outlet,
  useLoaderData,
  useParams,
  useNavigate,
  type LoaderFunctionArgs,
  type MetaFunction,
  useFetcher,
} from "react-router";
import { type Conversation, prisma } from "@db/db.server";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import calendar from "dayjs/plugin/calendar";
import Layout from "~/components/layout/layout";
import { MessageCircle, PlusCircle } from "react-feather";
import { PERMISSIONS } from "~/types/auth";
import { useEffect, useState } from "react";
import { Intent } from "./chat.$agentId._index";
import { loadConversations } from "./utils/chat";
import { Button } from "~/components/ui/button";
// Initialize the plugins
dayjs.extend(relativeTime);
dayjs.extend(calendar);

export const getConversationsByDay = (conversations: (Conversation & { messages: { createdAt: Date }[] })[]) => {
  const dayGroupedConversations = conversations.reduce(
    (
      acc: {
        [key: string]: (Conversation & { messages: { createdAt: Date }[] })[];
      },
      c,
    ) => {
      const date = dayjs(c.createdAt).calendar(null, {
        sameDay: "[Today]",
        lastDay: "[Yesterday]",
        lastWeek: "MMM D, YYYY",
        sameElse: "MMM D, YYYY",
      });
      acc[date] = acc[date] || [];
      acc[date].push(c);
      return acc;
    },
    {},
  );
  return Object.keys(dayGroupedConversations).map(
    (key) => ({
      date: key,
      conversations: dayGroupedConversations[key],
    }),
  );
};

const CONVERSATIONS_PER_PAGE = 25;

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { agentId } = params;

  const user = await hasAccess(request, PERMISSIONS.VIEW_AGENT, agentId);
  const conversations = await loadConversations({ page: 1, agentId: agentId as string, userId: user.id, take: CONVERSATIONS_PER_PAGE });
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
  });
  if (!agent) {
    throw new Response("Agent not found", { status: 404 });
  }

  return {
    conversations,
    user,
    agent,
  };
};

const ChatOverview = () => {
  const { agentId, conversationId } = useParams();
  const { conversations, agent, user } = useLoaderData<typeof loader>();

  const [allConversations, setAllConversations] = useState(conversations);
  const [currentConversationsByDay, setCurrentConversationsByDay] =
    useState(getConversationsByDay(conversations));
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const [editMode, setEditMode] = useState<string | null>(null);
  const [newTagline, setNewTagline] = useState<string>("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allConversationsLoaded, setAllConversationsLoaded] = useState(conversations.length < CONVERSATIONS_PER_PAGE);
  const [page, setPage] = useState(1);

  const loadMoreConversations = () => {
    if (isLoadingMore || fetcher.state !== "idle") return;
    setIsLoadingMore(true);
    fetcher.load(`/chat/${agentId}/loadMoreConversations?page=${page + 1}`);
    setPage((prev) => prev + 1);
  };

  useEffect(() => {
    if (fetcher.data?.conversations?.length) {
      setAllConversations((prev) => [
        ...prev,
        ...fetcher.data.conversations,
      ]);
    }
    if (fetcher.data?.conversations?.length < CONVERSATIONS_PER_PAGE) {
      setAllConversationsLoaded(true);
    }
  }, [fetcher.data]);

  useEffect(() => {
    setCurrentConversationsByDay(getConversationsByDay(allConversations));
  }, [allConversations]);

  useEffect(() => {
    if (fetcher.state === "idle") {
      setIsLoadingMore(false);
    }
  }, [fetcher.state]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        navigate(`/chat/${agentId}`, { replace: true });
      }
      if (editMode && event.key === "Enter") {
        event.preventDefault();
        handleTaglineChange(editMode, newTagline);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [agentId, navigate, editMode, newTagline]);

  const handleDoubleClick = (conversationId: string) =>
    setEditMode(conversationId);

  const handleTaglineChange = (conversationId: string, newTagline: string) => {
    fetcher.submit(
      { conversationId, newTagline, intent: Intent.UPDATE_TAGLINE },
      { method: "post", action: `/chat/${agentId}` },
    );
    // change label in allConversations
    setAllConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, tagline: newTagline } : c,
      ),
    );
    setEditMode(null);
  };

  return (
    <Layout
      navComponent={
        <div className="md:px-2 text-sm">
          <Link
            className="flex items-center gap-2 rounded-md px-3 py-2 transition-all bg-oak-green text-accent-foreground hover:bg-oak-green/90 mb-8"
            to={`/chat/${agentId}`}
            reloadDocument
          >
            <PlusCircle className="h-4 w-4" />
            New Conversation
          </Link>
          <h2 className="text-primary mb-4 flex items-center gap-2 px-3 py-2 border-b">
            <MessageCircle className="h-4 w-4" />
            Chats
          </h2>
          {currentConversationsByDay.map(({ date, conversations }) => (
            <div className="block mb-4 pb-4 overflow-auto border-b" key={date}>
              <h2 className="text-sm px-3 mb-2 font-medium text-primary">
                {date}
              </h2>
              {conversations
                .filter((e) => e && e.tagline)
                .map((c) =>
                  editMode === c.id ? (
                    <input
                      type="text"
                      className={`w-full py-2 block px-3 transition-all rounded-md text-sm font-normal focus:outline-none ${conversationId === c.id ? "bg-stone-900 text-white" : "text-neutral-900"}`}
                      defaultValue={c.tagline || ""}
                      key={c.id}
                      onChange={(e) => setNewTagline(e.target.value)}
                      onBlur={(e) => handleTaglineChange(c.id, e.target.value)}
                      autoFocus
                    />
                  ) : (
                    <Link
                      className={`py-2 block px-3 transition-all rounded-md text-sm font-normal ${conversationId === c.id ? "bg-stone-900 text-white" : "hover:bg-stone-900 hover:text-white text-neutral-900"}`}
                      to={`/chat/${agentId}/${c.id}`}
                      key={c.id}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        handleDoubleClick(c.id);
                      }}
                    >
                      {c.tagline}
                    </Link>
                  ),
                )}
            </div>
          ))}
          {!allConversationsLoaded && (
            <Button
              variant="outline"
              className="w-full mb-8"
              onClick={loadMoreConversations}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading..." : "Load More"}
            </Button>
          )}
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
