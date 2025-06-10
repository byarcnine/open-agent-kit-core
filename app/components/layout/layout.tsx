import { useState, useEffect, useRef } from "react";
import { LogOut, Menu, X, ChevronDown, Check } from "react-feather";
import { Link, useNavigate } from "react-router";
import type { User } from "better-auth";
import { authClient } from "~/lib/auth/auth.client";
import { cn } from "~/lib/utils";
import "./layout.scss";

type Space = {
  id: string;
  name: string;
  description?: string;
};

const SPACES = [
  {
    id: "1",
    name: "Space 1",
    description: "Space 1 description",
  },
  {
    id: "2",
    name: "Space 2",
    description: "Space 2 description",
  },
  {
    id: "3",
    name: "Space 3",
    description: "Space 3 description",
  },
];

const Layout = ({
  children,
  user,
  agentName,
  navComponent,
  spaces = SPACES,
  currentSpace,
  onSpaceChange,
}: {
  children: React.ReactNode;
  user?: User;
  agentName?: string;
  navComponent?: React.ReactNode;
  spaces?: Space[];
  currentSpace?: Space;
  onSpaceChange?: (space: Space) => void;
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [spaceDropdownOpen, setSpaceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        <div className="hidden border-r bg-zinc-200/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-4">
            <div className="flex items-center border-b px-4 py-4">
              <div className="relative w-full" ref={dropdownRef}>
                <button
                  onClick={() => setSpaceDropdownOpen(!spaceDropdownOpen)}
                  className="flex items-center gap-2 w-full text-left hover:bg-zinc-100 rounded-md p-2 transition-colors"
                >
                  <div className="rounded-md overflow-hidden flex-shrink-0">
                    <img
                      src="/assets/logo.svg"
                      alt="OAK - Open Agent Kit"
                      className="w-8"
                    />
                  </div>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <span className="truncate font-medium">
                      {currentSpace?.name || agentName || "OAK"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {currentSpace?.description || "Agent Dashboard"}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      spaceDropdownOpen && "rotate-180",
                    )}
                  />
                </button>

                {spaceDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                    {spaces.length > 0 ? (
                      spaces.map((space) => (
                        <button
                          key={space.id}
                          onClick={() => {
                            onSpaceChange?.(space);
                            setSpaceDropdownOpen(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-zinc-50 transition-colors"
                        >
                          <div className="flex flex-col flex-1">
                            <span className="font-medium">{space.name}</span>
                            {space.description && (
                              <span className="text-xs text-muted-foreground">
                                {space.description}
                              </span>
                            )}
                          </div>
                          {currentSpace?.id === space.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No spaces available
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 flex justify-between flex-col overflow-auto scrollbar-none">
              <div className="overflow-auto scrollbar-none flex-1">
                {navComponent}
              </div>

              {user && (
                <div className="flex items-center justify-between gap-2 px-4 py-4 border-t">
                  <Link
                    to="/user/settings"
                    title="Settings"
                    aria-label="Settings"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors hover:underline"
                  >
                    <span className="text-sm text-muted-foreground">
                      {user.name}
                    </span>
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
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
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
        <div className="md:hidden w-full flex flex-col max-h-screen">
          <header className="flex items-center justify-between px-4 py-4 bg-zinc-200/40 border-b">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/assets/logo.svg"
                alt="OAK - Open Agent Kit"
                className="w-8"
              />
              <span>{agentName || "OAK Dashboard"}</span>
            </Link>
            <button
              onClick={() => setMobileNavOpen((prev) => !prev)}
              aria-label={mobileNavOpen ? "Close Menu" : "Open Menu"}
            >
              {mobileNavOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </header>
          {mobileNavOpen && (
            <nav className="border-t bg-zinc-200/40 shadow-md overflow-hidden flex flex-col">
              <div className="px-4 py-4 overflow-y-auto overflow-x-hidden">
                {navComponent}
              </div>
              {user && (
                <div className="flex items-center justify-between gap-2 px-4 py-4 border-t">
                  <Link
                    to="/user/settings"
                    title="Settings"
                    aria-label="Settings"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">
                      {user.name}
                    </span>
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
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
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
