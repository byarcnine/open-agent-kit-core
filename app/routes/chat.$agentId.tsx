import {
  Link,
  Outlet,
  useLoaderData,
  useParams,
  useNavigate,
  type LoaderFunctionArgs,
  type MetaFunction,
  useFetcher,
  useMatches,
  data,
  useLocation,
} from "react-router";
import { type Conversation, prisma } from "@db/db.server";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import calendar from "dayjs/plugin/calendar";
import Layout from "~/components/layout/layout";
import { MessageCircle, PlusCircle, MoreVertical, Box } from "react-feather";
import { PERMISSIONS } from "~/types/auth";
import { useEffect, useState } from "react";
import { Intent } from "./chat.$agentId._index";
import { loadConversations } from "./utils/chat";
import { Button } from "~/components/ui/button";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "~/lib/utils";
import { getUserRoutesForAgent } from "~/lib/plugins/availability.server";
// Initialize the plugins
dayjs.extend(relativeTime);
dayjs.extend(calendar);

export const getConversationsByDay = (
  conversations: (Conversation & { messages: { createdAt: Date }[] })[],
) => {
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
  return Object.keys(dayGroupedConversations).map((key) => ({
    date: key,
    conversations: dayGroupedConversations[key],
  }));
};

const CONVERSATIONS_PER_PAGE = 25;

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { agentId } = params;

  const user = await hasAccess(request, PERMISSIONS.VIEW_AGENT, agentId);
  const conversationsPromise = loadConversations({
    page: 1,
    agentId: agentId as string,
    userId: user.id,
    take: CONVERSATIONS_PER_PAGE,
    archived: false,
  });
  const userChatPagesPromise = getUserRoutesForAgent(agentId as string);
  const agentPromise = prisma.agent
    .findUnique({
      where: {
        id: agentId,
      },
    })
    .then((agent) => {
      if (!agent) {
        throw new Response("Agent not found", { status: 404 });
      }
      return agent;
    });
  const [conversations, userChatPages, agent] = await Promise.all([
    conversationsPromise,
    userChatPagesPromise,
    agentPromise,
  ]);
  return {
    conversations,
    user,
    agent,
    userChatPages,
  };
};

const ChatOverview = () => {
  const { agentId, conversationId } = useParams();
  const { conversations, agent, user, userChatPages } =
    useLoaderData<typeof loader>();
  const [allConversations, setAllConversations] = useState(conversations);
  const [currentConversationsByDay, setCurrentConversationsByDay] = useState(
    getConversationsByDay(conversations),
  );
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const location = useLocation();
  const [editMode, setEditMode] = useState<string | null>(null);
  const [newTagline, setNewTagline] = useState<string>("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allConversationsLoaded, setAllConversationsLoaded] = useState(
    conversations.length < CONVERSATIONS_PER_PAGE,
  );
  const [page, setPage] = useState(1);
  const [currentConversationIndex, setCurrentConversationIndex] =
    useState(conversationId);

  const loadMoreConversations = () => {
    if (isLoadingMore || fetcher.state !== "idle") return;
    setIsLoadingMore(true);
    fetcher.load(`/chat/${agentId}/loadMoreConversations?page=${page + 1}`);
    setPage((prev) => prev + 1);
  };

  useEffect(() => {
    if (fetcher.data?.conversations?.length) {
      setAllConversations((prev) => [...prev, ...fetcher.data.conversations]);
    }
    if (fetcher.data?.conversations?.length < CONVERSATIONS_PER_PAGE) {
      setAllConversationsLoaded(true);
    }
  }, [fetcher.data]);

  useEffect(() => {
    setCurrentConversationsByDay(getConversationsByDay(allConversations));
  }, [allConversations]);

  useEffect(() => {
    setAllConversations(conversations);
  }, [conversations.map((c) => c.createdAt.toISOString()).join(";")]);

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

  const handleRename = (cid: string) => {
    setEditMode(cid);
  };

  useEffect(() => {
    setCurrentConversationIndex(conversationId);
  }, [conversationId]);

  const handleDelete = (cid: string) => {
    if (!confirm("Are you sure you want to delete this conversation?")) {
      return;
    }
    fetcher.submit(
      { conversationId: cid, intent: Intent.ARCHIVE_CONVERSATION },
      { method: "post", action: `/chat/${agentId}` },
    );

    if (conversationId === cid) {
      navigate(`/chat/${agentId}`);
    }

    setAllConversations((prev) => prev.filter((c) => c.id !== cid));
  };
  return (
    <Layout
      navComponent={
        <div className="md:px-2 text-sm">
          {userChatPages?.length > 0 && (
            <>
              <h2 className="text-primary mb-4 flex items-center gap-2 px-3 py-2 border-b">
                <Box className="h-4 w-4" />
                Plugins
              </h2>
              <div className="flex flex-col gap-2">
                {userChatPages.map((p) => (
                  <Link
                    key={p.slug}
                    to={`/chat/${agentId}/plugins/${p.slug}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 mb-8",
                      location.pathname.startsWith(
                        `/chat/${agentId}/plugins/${p.slug}`,
                      )
                        ? "bg-stone-900 text-white"
                        : "hover:bg-stone-900 hover:text-white text-neutral-900",
                    )}
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            </>
          )}
          <h2 className="text-primary mb-4 flex items-center gap-2 px-3 py-2 border-b">
            <MessageCircle className="h-4 w-4" />
            Chats
          </h2>
          <Link
            className="flex items-center gap-2 rounded-md px-3 py-2 transition-all bg-oak-green text-accent-foreground hover:bg-oak-green/90 mb-8"
            to={`/chat/${agentId}`}
            reloadDocument
          >
            <PlusCircle className="h-4 w-4" />
            New Conversation
          </Link>
          {currentConversationsByDay.map(({ date, conversations }) => (
            <div key={date} className="block mb-4 pb-4 overflow-auto border-b">
              <h2 className="text-sm px-3 mb-2 font-medium text-primary">
                {date}
              </h2>
              {conversations
                .filter((e) => e && e.tagline)
                .map((c) => (
                  <Popover.Root key={c.id}>
                    <div
                      className={cn(
                        "flex justify-between transition-all rounded-md text-sm font-normal relative group",
                        currentConversationIndex === c.id
                          ? "bg-stone-900 text-white"
                          : "hover:bg-stone-900 hover:text-white text-neutral-900",
                      )}
                    >
                      {editMode === c.id ? (
                        <input
                          type="text"
                          className={`w-full flex-1 block py-2 px-3 rounded-md text-sm font-normal focus:outline-none`}
                          defaultValue={c.tagline || ""}
                          key={c.id}
                          onChange={(e) => setNewTagline(e.target.value)}
                          onBlur={(e) =>
                            handleTaglineChange(c.id, e.target.value)
                          }
                          autoFocus
                        />
                      ) : (
                        <Link
                          className={`py-2 block px-3 flex-1 rounded-md text-sm font-normal`}
                          to={`/chat/${agentId}/${c.id}`}
                          key={c.id}
                          prefetch="intent"
                          onDoubleClick={(e) => {
                            e.preventDefault();
                            handleRename(c.id);
                          }}
                        >
                          {c.tagline}
                        </Link>
                      )}
                      <Popover.Trigger asChild>
                        <div className="w-10 h-auto flex items-center justify-center cursor-pointer">
                          <MoreVertical className="w-4 h-4 text-white" />
                        </div>
                      </Popover.Trigger>
                      <Popover.Anchor asChild>
                        <span />
                      </Popover.Anchor>
                    </div>
                    <Popover.Portal>
                      <Popover.Content
                        side="right"
                        align="start"
                        sideOffset={0}
                        className="p-2 bg-white rounded-md border w-40 shadow-sm text-sm z-10"
                      >
                        <div className="flex flex-col space-y-1">
                          <button
                            type="button"
                            onClick={() => handleRename(c.id)}
                            className="text-left p-1 hover:bg-gray-100 rounded items-center w-full focus:outline-none"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            className="text-left text-destructive p-1 hover:bg-gray-100 rounded flex items-center w-full focus:outline-none"
                          >
                            Delete
                          </button>
                        </div>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                ))}
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
      <Outlet
        context={{
          onConversationStart: (conversationId: string) =>
            setCurrentConversationIndex(conversationId),
        }}
      />
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
