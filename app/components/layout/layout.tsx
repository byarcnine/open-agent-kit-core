import { useEffect, useRef, useState } from "react";
import { ChevronLeft, LogOut, Menu, X } from "react-feather";
import { Link, useParams } from "react-router";
import type { User } from "better-auth";
import { authClient } from "../../lib/auth/auth.client";
import { cn } from "../../lib/utils";
import "./layout.scss";

const Layout = ({
  children,
  user,
  agentName,
  navComponent,
  agentSpaceId,
}: {
  children: React.ReactNode;
  user?: User;
  agentName?: string;
  navComponent?: React.ReactNode;
  agentSpaceId?: string;
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [spaceDropdownOpen, setSpaceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { agentId, spaceId = agentSpaceId } = useParams();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setSpaceDropdownOpen(false);
      }
    };

    if (spaceDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [spaceDropdownOpen]);

  return (
    <div className={cn("flex-1 flex-shrink-0 w-full overflow-hidden")}>
      <div className="h-full w-full flex flex-col md:grid md:grid-cols-[300px_1fr] lg:grid-cols-[330px_1fr]">
        {/* Desktop Sidebar */}
        <div className="hidden border-r bg-neutral-200 md:block">
          <div className="flex h-full max-h-screen flex-col gap-4">
            <div
              className={cn(
                "flex items-center border-b bg-primary rounded-b-2xl",
                agentName ? "p-3" : "p-4",
              )}
            >
              <Link
                to={agentId ? `/space/${spaceId}` : "/"}
                className="flex flex-col gap-1 w-full overflow-hidden"
              >
                <span className="text-base flex items-center gap-2">
                  {agentName ? (
                    <div className="flex gap-2 items-center text-white">
                      <div className="bg-white p-2 rounded-xl overflow-hidden flex-shrink-0">
                        <ChevronLeft className="h-4 w-4 cursor-pointer text-primary" />
                      </div>
                      <span className="truncate">{agentName}</span>
                    </div>
                  ) : (
                    <div className="rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src="/assets/logo.svg"
                        alt="OAK - Open Agent Kit"
                        className="w-8"
                      />
                    </div>
                  )}
                  {!agentName && (
                    <div className="flex flex-col flex-1 overflow-hidden text-white">
                      <span className="truncate font-medium">OAK</span>
                      <span className="text-xs">
                        Enterprise GenAI Platform
                      </span>
                    </div>
                  )}
                </span>
              </Link>
            </div>
            <div className="flex-1 flex justify-between flex-col overflow-auto scrollbar-none">
              <div className="overflow-auto scrollbar-none flex-1">
                {navComponent}
              </div>

              {user && (
                <div className="flex items-center justify-between gap-2 px-4 py-4 border-t bg-primary rounded-t-2xl">
                  <Link
                    to="/user/settings"
                    title="Settings"
                    aria-label="Settings"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors hover:underline"
                  >
                    <span className="text-sm text-white">{user.name}</span>
                  </Link>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => {
                        authClient.signOut().then(() => {
                          window.location.reload();
                        });
                      }}
                      title="Sign out"
                      aria-label="Sign out"
                      className="text-sm text-white transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Header & Navigation */}
        <div
          className={cn(
            "md:hidden w-full flex flex-col max-h-screen bg-neutral-200 shadow-md",
            {
              "min-h-dvh": mobileNavOpen,
            },
          )}
        >
          <header
            className={cn(
              "flex items-center justify-between bg-primary rounded-b-2xl border-b",
              agentName ? "p-3" : "p-4",
            )}
          >
            <Link to="/" className="flex items-center gap-2">
              {agentName ? (
                <div className="flex gap-2 items-center text-white">
                  <div className="bg-sky-800/20 p-2 rounded-xl overflow-hidden flex-shrink-0">
                    <ChevronLeft className="h-4 w-4 cursor-pointer" />
                  </div>
                  <span className="truncate">{agentName}</span>
                </div>
              ) : (
                <img
                  src="/assets/logo.svg"
                  alt="OAK - Open Agent Kit"
                  className="w-8"
                />
              )}

              {!agentName && (
                <div className="flex flex-col flex-1 overflow-hidden text-white">
                  <span className="truncate font-medium">OAK</span>
                  <span className="text-xs">
                    Enterprise GenAI Platform
                  </span>
                </div>
              )}
            </Link>
            <button
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label={mobileNavOpen ? "Close Menu" : "Open Menu"}
            >
              {mobileNavOpen ? (
                <X className="h-6 w-6 text-white" />
              ) : (
                <Menu className="h-6 w-6 text-white" />
              )}
            </button>
          </header>
          {mobileNavOpen && (
            <nav className="overflow-hidden flex flex-col h-full">
              <div className="px-2 py-4 overflow-y-auto overflow-x-hidden flex-1">
                {navComponent}
              </div>
              {user && (
                <div className="flex bg-primary items-center justify-between gap-2 px-4 py-4 rounded-t-2xl">
                  <Link
                    to="/user/settings"
                    title="Settings"
                    aria-label="Settings"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <span className="text-sm text-white">{user.name}</span>
                  </Link>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => {
                        authClient.signOut().then(() => {
                          window.location.reload();
                        });
                      }}
                      title="Sign out"
                      aria-label="Sign out"
                      className="text-sm text-whitetransition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </nav>
          )}
        </div>
        {/* Main Content */}
        <main className="flex w-full max-h-screen h-full overflow-y-auto">
          <div className="h-full w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
