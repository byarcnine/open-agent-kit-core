import type { Agent } from "@prisma/client";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";
import type { PluginWithAvailability } from "~/types/plugins";

const AgentAvailabilitySelector = ({
  selectedPlugin,
  agents,
  setSelectedPluginIdentifier,
  onSetAvailability,
}: {
  selectedPlugin: PluginWithAvailability | null;
  agents: Agent[];
  setSelectedPluginIdentifier: (toolIdentifier: string | null) => void;
  onSetAvailability: (isGlobal: boolean, agentIds: string[]) => void;
}) => {
  const isGlobalEnabled = !!selectedPlugin?.isGlobal;
  const [selectedAgents, setSelectedAgents] = useState<string[]>(
    selectedPlugin?.agents.map((a) => a.id) || []
  );

  const onGlobalToggle = (checked: boolean) => {
    onSetAvailability(
      checked,
      checked ? agents.map((a) => a.id) : selectedAgents
    );
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
    onSetAvailability(false, newSelectedAgents);
  };

  useEffect(() => {
    setSelectedAgents(selectedPlugin?.agents.map((a) => a.id) || []);
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
                }
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
                switch to make it available to specific agents.
              </span>
            )}
            {!isGlobalEnabled && (
              <div className="space-y-2">
                <span className="text-base font-medium">
                  Activate specific Agents
                </span>
                {agents.map((agent, index) => (
                  <div
                    key={agent.id}
                    className={cn(
                      "py-2 rounded-md flex items-center justify-between",
                      {
                        "border-b": index !== agents.length - 1,
                      }
                    )}
                  >
                    <span className="">{agent.name}</span>
                    <Switch
                      defaultChecked={selectedPlugin?.agents.some(
                        (a) => a.id === agent.id
                      )}
                      onCheckedChange={(value) =>
                        onAgentToggle(agent.id, value)
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgentAvailabilitySelector;
