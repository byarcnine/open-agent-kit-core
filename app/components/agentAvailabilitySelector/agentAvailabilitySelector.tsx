import type { Agent, Space } from "@prisma/client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Switch } from "../ui/switch";
import { cn } from "../../lib/utils";
import type { PluginWithAvailability } from "../../types/plugins";
import { ChevronDown, ChevronRight } from "react-feather";

type SpaceWithAgents = Space & {
  agents: Agent[];
};

const AgentAvailabilitySelector = ({
  selectedPlugin,
  spaces,
  setSelectedPluginIdentifier,
  onSetAvailability,
}: {
  selectedPlugin: PluginWithAvailability | null;
  spaces: SpaceWithAgents[];
  setSelectedPluginIdentifier: (toolIdentifier: string | null) => void;
  onSetAvailability: (
    isGlobal: boolean,
    agentIds: string[],
    spaceIds: string[],
  ) => void;
}) => {
  const isGlobalEnabled = !!selectedPlugin?.isGlobal;
  const [selectedAgents, setSelectedAgents] = useState<string[]>(
    selectedPlugin?.agents.map((a) => a.id) || [],
  );
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>(
    selectedPlugin?.spaces.map((s) => s.id) || [],
  );
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());

  // Get all agents from all spaces
  const allAgents = spaces.flatMap((space) => space.agents);

  const onGlobalToggle = (checked: boolean) => {
    onSetAvailability(
      checked,
      checked ? allAgents.map((a) => a.id) : selectedAgents,
      checked ? spaces.map((s) => s.id) : selectedSpaces,
    );
  };

  const onSpaceToggle = (spaceId: string, value: boolean) => {
    let newSelectedSpaces: string[] = [];
    let newSelectedAgents: string[] = [...selectedAgents];

    if (value) {
      // add space to selected spaces
      newSelectedSpaces = [...selectedSpaces, spaceId];
      // also add all agents from this space
      const spaceAgents = spaces.find((s) => s.id === spaceId)?.agents || [];
      const spaceAgentIds = spaceAgents.map((a) => a.id);
      newSelectedAgents = [...new Set([...selectedAgents, ...spaceAgentIds])];
    } else {
      // remove space from selected spaces
      newSelectedSpaces = selectedSpaces.filter((id) => id !== spaceId);
      // also remove all agents from this space
      const spaceAgents = spaces.find((s) => s.id === spaceId)?.agents || [];
      const spaceAgentIds = spaceAgents.map((a) => a.id);
      newSelectedAgents = selectedAgents.filter(
        (id) => !spaceAgentIds.includes(id),
      );
    }

    setSelectedSpaces(newSelectedSpaces);
    setSelectedAgents(newSelectedAgents);
    onSetAvailability(false, newSelectedAgents, newSelectedSpaces);
  };

  const onAgentToggle = (agentId: string, value: boolean) => {
    let newSelectedAgents: string[] = [];
    if (value) {
      // add agent to selected agents
      newSelectedAgents = [...selectedAgents, agentId];
    } else {
      // remove agent from selected agents
      newSelectedAgents = selectedAgents.filter((id) => id !== agentId);
    }

    setSelectedAgents(newSelectedAgents);
    onSetAvailability(false, newSelectedAgents, selectedSpaces);
  };

  const toggleSpaceExpansion = (spaceId: string) => {
    const newExpanded = new Set(expandedSpaces);
    if (newExpanded.has(spaceId)) {
      newExpanded.delete(spaceId);
    } else {
      newExpanded.add(spaceId);
    }
    setExpandedSpaces(newExpanded);
  };

  useEffect(() => {
    setSelectedAgents(selectedPlugin?.agents.map((a) => a.id) || []);
    setSelectedSpaces(selectedPlugin?.spaces.map((s) => s.id) || []);
  }, [selectedPlugin]);

  return (
    <Dialog
      open={!!selectedPlugin}
      onOpenChange={() => setSelectedPluginIdentifier(null)}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings for {selectedPlugin?.name} </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="text-sm">
            <div
              className={cn(
                "flex flex-row items-center justify-between mb-4 pb-4",
                {
                  "border-b border-border": !isGlobalEnabled,
                },
              )}
            >
              <span className="text-base font-medium">
                Active for all Agents
              </span>
              <Switch
                defaultChecked={isGlobalEnabled}
                onCheckedChange={onGlobalToggle}
              />
            </div>
            {isGlobalEnabled && (
              <span className="text-sm text-muted-foreground">
                This plugin is currently available to all agents. Click the
                switch to make it available to specific agents or spaces.
              </span>
            )}
            {!isGlobalEnabled && (
              <div className="space-y-4">
                <div>
                  <span className="text-base font-medium mb-3 block">
                    Activate specific Spaces and Agents
                  </span>
                  <div className="space-y-2">
                    {spaces.map((space) => (
                      <div key={space.id} className="space-y-1">
                        <div className="flex items-center justify-between py-2 px-3 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <button
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                              onClick={() => toggleSpaceExpansion(space.id)}
                            >
                              {expandedSpaces.has(space.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                            <span className="font-medium">{space.name}</span>
                            <span className="text-sm text-muted-foreground">
                              ({space.agents.length} agents)
                            </span>
                          </div>
                          <Switch
                            defaultChecked={selectedPlugin?.spaces.some(
                              (s) => s.id === space.id,
                            )}
                            onCheckedChange={(value) =>
                              onSpaceToggle(space.id, value)
                            }
                          />
                        </div>
                        {expandedSpaces.has(space.id) && (
                          <div className="ml-8 space-y-1">
                            {space.agents.map((agent) => (
                              <div
                                key={agent.id}
                                className="py-2 px-3 rounded-lg border flex items-center justify-between bg-gray-50 dark:bg-gray-900"
                              >
                                <span className="text-sm">{agent.name}</span>
                                <Switch
                                  defaultChecked={selectedPlugin?.agents.some(
                                    (a) => a.id === agent.id,
                                  )}
                                  onCheckedChange={(value) =>
                                    onAgentToggle(agent.id, value)
                                  }
                                  disabled={selectedPlugin?.spaces.some(
                                    (s) => s.id === space.id,
                                  )}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentAvailabilitySelector;
