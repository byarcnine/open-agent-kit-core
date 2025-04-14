import {
  Clipboard,
  CornerDownRight,
  Database,
  Inbox,
  MessageSquare,
  Settings,
  Tool,
  Type,
  Users,
} from "react-feather";
import { cn } from "~/lib/utils";
import { Link, useLocation, useParams } from "react-router";
import type { MenuItem } from "~/types/plugins";
import FeatherIcon from "~/components/featherIcon/featherIcon";

export const AdminNav = ({
  pluginMenuItems = [],
}: {
  pluginMenuItems: MenuItem[];
}) => {
  const { agentId } = useParams();
  const location = useLocation();
  return (
    <nav className="grid items-start md:px-2 text-sm font-medium lg:px-4">
      <Link
        to={`/agent/${agentId}`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
          {
            "bg-zinc-200 text-primary":
              location.pathname === `/agent/${agentId}`,
          },
        )}
      >
        <Type className="h-4 w-4" />
        Playground
      </Link>
      <Link
        to={`/agent/${agentId}/conversations`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
          {
            "bg-zinc-200 text-primary": location.pathname.includes(
              `/agent/${agentId}/conversations`,
            ),
          },
        )}
      >
        <MessageSquare className="h-4 w-4" />
        Conversations
      </Link>
      <Link
        to={`/agent/${agentId}/prompts`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
          {
            "bg-zinc-200 text-primary": location.pathname.includes(
              `/agent/${agentId}/prompts`,
            ),
          },
        )}
      >
        <Clipboard className="h-4 w-4" />
        System Prompt
      </Link>
      <Link
        to={`/agent/${agentId}/knowledge`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
          {
            "bg-zinc-200 text-primary": location.pathname.includes(
              `/agent/${agentId}/knowledge`,
            ),
          },
        )}
      >
        <Database className="h-4 w-4" />
        Knowledge
      </Link>
      <Link
        to={`/agent/${agentId}/feedback`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
          {
            "bg-zinc-200 text-primary": location.pathname.includes(
              `/agent/${agentId}/feedback`,
            ),
          },
        )}
      >
        <Inbox className="h-4 w-4" />
        Feedback
      </Link>
      <Link
        to={`/agent/${agentId}/plugins`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
          {
            "bg-zinc-200 text-primary": location.pathname.includes(
              `/agent/${agentId}/plugins`,
            ),
          },
        )}
      >
        <Tool className="h-4 w-4" />
        Plugins & MCPs
      </Link>
      {pluginMenuItems.map((item) => {
        const href = `/agent/${agentId}/plugins/${item.href}`;
        return (
          <Link
            to={href}
            prefetch="intent"
            key={item.label}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
              {
                "bg-zinc-200 text-primary": location.pathname.includes(href),
              },
            )}
          >
            <CornerDownRight className="h-4 w-4" />
            <FeatherIcon className="h-4 w-4" iconName={item.icon} />
            {item.label}
          </Link>
        );
      })}
      <Link
        to={`/agent/${agentId}/users`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
          {
            "bg-zinc-200 text-primary": location.pathname.includes(
              `/agent/${agentId}/users`,
            ),
          },
        )}
      >
        <Users className="h-4 w-4" />
        Users
      </Link>
      <Link
        to={`/agent/${agentId}/settings`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
          {
            "bg-zinc-200 text-primary": location.pathname.includes(
              `/agent/${agentId}/settings`,
            ),
          },
        )}
      >
        <Settings className="h-4 w-4" />
        Agent Settings
      </Link>

      <a
        href={`/chat/${agentId}`}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 transition-all text-muted-foreground hover:text-primary",
          {
            "bg-zinc-200 text-primary": location.pathname.includes(
              `/chat/${agentId}`,
            ),
          },
        )}
      >
        <MessageSquare className="h-4 w-4" />
        Chat
      </a>
    </nav>
  );
};
