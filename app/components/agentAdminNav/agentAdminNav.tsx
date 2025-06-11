import {
  BookOpen,
  CornerDownRight,
  Database,
  Inbox,
  MessageSquare,
  Play,
  Settings,
  Star,
  Tool,
  Users,
} from "react-feather";
import { cn } from "../../lib/utils";
import { Link, useLocation, useParams } from "react-router";
import type { MenuItem } from "../../types/plugins";
import FeatherIcon from "../featherIcon/featherIcon";

export const AgentAdminNav = ({
  pluginMenuItems = [],
  spaceId,
}: {
  pluginMenuItems: MenuItem[];
  spaceId: string;
}) => {
  const { agentId } = useParams();
  const location = useLocation();
  return (
    <nav className="flex flex-col gap-0.5 md:px-2 text-sm h-full w-full">
      <Link
        to={`/space/${spaceId}/agent/${agentId}`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 transition-all",
          {
            "bg-white text-primary":
              location.pathname === `space/${spaceId}/agent/${agentId}`,
          },
          {
            "hover:bg-white/50":
              location.pathname !== `space/${spaceId}/agent/${agentId}`,
          },
        )}
      >
        <Play
          className={cn("h-4 w-4", {
            "text-primary":
              location.pathname === `space/${spaceId}/agent/${agentId}`,
          })}
        />
        <div className="flex flex-col">
          <span className="">Playground</span>
          <span className="text-xs">Interact with the agent</span>
        </div>
      </Link>

      <Link
        to={`space/${spaceId}/agent/${agentId}/prompts`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 transition-all ",
          {
            "bg-white text-primary": location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/prompts`,
            ),
          },
          {
            "hover:bg-white/50": !location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/prompts`,
            ),
          },
        )}
      >
        <Star
          className={cn("h-4 w-4", {
            "text-primary": location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/prompts`,
            ),
          })}
        />
        <div className="flex flex-col">
          <span className="">Prompt</span>
          <span className="text-xs">Create guidelines for your agent</span>
        </div>
      </Link>
      <Link
        to={`space/${spaceId}/agent/${agentId}/knowledge`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 transition-all ",
          {
            "bg-white text-primary": location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/knowledge`,
            ),
          },
          {
            "hover:bg-white/50": !location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/knowledge`,
            ),
          },
        )}
      >
        <Database
          className={cn("h-4 w-4", {
            "text-primary": location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/knowledge`,
            ),
          })}
        />
        <div className="flex flex-col">
          <span className="">Knowledge</span>
          <span className="text-xs">Add your documents and data</span>
        </div>
      </Link>

      <Link
        to={`space/${spaceId}/agent/${agentId}/feedback`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 transition-all ",
          {
            "bg-white text-primary": location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/feedback`,
            ),
          },
          {
            "hover:bg-white/50": !location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/feedback`,
            ),
          },
        )}
      >
        <Inbox
          className={cn("h-4 w-4", {
            "text-primary": location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/feedback`,
            ),
          })}
        />
        <div className="flex flex-col">
          <span className="">Feedback</span>
          <span className="text-xs">Review and manage agent feedback</span>
        </div>
      </Link>
      <Link
        to={`space/${spaceId}/agent/${agentId}/plugins`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 transition-all ",
          {
            "bg-white text-primary":
              location.pathname.includes(
                `space/${spaceId}/agent/${agentId}/plugins`,
              ) &&
              // If the current path includes any of the plugin menu items, don't highlight the plugins link
              !pluginMenuItems.some((item) =>
                location.pathname.includes(
                  `space/${spaceId}/agent/${agentId}/plugins/${item.href}`,
                ),
              ),
          },
          {
            "hover:bg-white/50":
              !location.pathname.includes(
                `space/${spaceId}/agent/${agentId}/plugins`,
              ) ||
              pluginMenuItems.some((item) =>
                location.pathname.includes(
                  `space/${spaceId}/agent/${agentId}/plugins/${item.href}`,
                ),
              ),
          },
        )}
      >
        <Tool
          className={cn("h-4 w-4", {
            "text-primary":
              location.pathname.includes(
                `space/${spaceId}/agent/${agentId}/plugins`,
              ) &&
              !pluginMenuItems.some((item) =>
                location.pathname.includes(
                  `space/${spaceId}/agent/${agentId}/plugins/${item.href}`,
                ),
              ),
          })}
        />
        <div className="flex flex-col">
          <span className="">Tools</span>
          <span className="text-xs">Used by agents to complete tasks</span>
        </div>
      </Link>
      {pluginMenuItems.length > 0 && (
        <div className="mt-1 gap-1 flex flex-col">
          {pluginMenuItems.map((item) => {
            const href = `space/${spaceId}/agent/${agentId}/plugins/${item.href}`;
            return (
              <Link
                to={href}
                prefetch="intent"
                key={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 transition-all ",
                  {
                    "bg-white text-primary": location.pathname.includes(href),
                  },
                  {
                    "hover:bg-white/50": !location.pathname.includes(href),
                  },
                )}
              >
                <CornerDownRight className="h-4 w-4" />
                <FeatherIcon className="h-4 w-4" iconName={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      <Link
        to={`space/${spaceId}/agent/${agentId}/conversations`}
        prefetch="intent"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 transition-all ",
          {
            "bg-white text-primary": location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/conversations`,
            ),
          },
          {
            "hover:bg-white/50": !location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/conversations`,
            ),
          },
        )}
      >
        <BookOpen
          className={cn("h-4 w-4", {
            "text-primary": location.pathname.includes(
              `space/${spaceId}/agent/${agentId}/conversations`,
            ),
          })}
        />
        <div className="flex flex-col">
          <span className="">History</span>
          <span className="text-xs">View recent agent conversations</span>
        </div>
      </Link>
      <a
        href={`/chat/${agentId}`}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 transition-all ",
          {
            "bg-white text-primary": location.pathname.includes(
              `/chat/${agentId}`,
            ),
          },
          {
            "hover:bg-white/50": !location.pathname.includes(
              `/chat/${agentId}`,
            ),
          },
        )}
      >
        <MessageSquare
          className={cn("h-4 w-4", {
            "text-primary": location.pathname.includes(`/chat/${agentId}`),
          })}
        />
        <div className="flex flex-col">
          <span className="">Chat</span>
          <span className="text-xs">Opens chat without the admin UI</span>
        </div>
      </a>

      <div className="mt-auto mb-4 border-t border-white pt-4 flex flex-col gap-0.5">
        <Link
          to={`space/${spaceId}/agent/${agentId}/settings`}
          prefetch="intent"
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 transition-all ",
            {
              "bg-white text-primary": location.pathname.includes(
                `space/${spaceId}/agent/${agentId}/settings`,
              ),
            },
            {
              "hover:bg-white/50": !location.pathname.includes(
                `space/${spaceId}/agent/${agentId}/settings`,
              ),
            },
          )}
        >
          <Settings
            className={cn("h-4 w-4", {
              "text-primary": location.pathname.includes(
                `space/${spaceId}/agent/${agentId}/settings`,
              ),
            })}
          />
          <div className="flex flex-col">
            <span className="">Settings</span>
            <span className="text-xs">
              Choose model, default parameters etc.
            </span>
          </div>
        </Link>
      </div>
    </nav>
  );
};
