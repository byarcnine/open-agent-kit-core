import { cn } from "~/lib/utils";

const AgentDefaultOptions = ({
  onSelect,
}: {
  onSelect: (option: string) => void;
}) => {
  const options = [
    {
      id: "agent-custom",
      label: "Custom Setup",
      description: "Create an agent from scratch with custom settings",
      enabled: true,
    },
    {
      id: "agent-knowledge",
      label: "Give agent knowledge",
      description:
        "Upload files and instantly create an agent with the knowledge",
      enabled: false,
    },
    {
      id: "agent-tools",
      label: "Connect tools",
      description:
        "Microsoft, Slack, ... and more. Connect your tools to your agent.",
      enabled: false,
    },
  ];

  return (
    <div className="flex flex-col">
      <span className="text-base mb-4">...or choose a starting point</span>
      <div className="flex gap-2">
        {options
          .filter((e) => e.enabled)
          .map((option) => (
            <button
              key={option.id}
              className={cn(
                "p-2 rounded-lg border hover:bg-neutral-200 transition flex items-center gap-2",
              )}
              onClick={() => onSelect(option.id)}
              disabled={!option.enabled}
            >
              <div className="flex flex-col gap-1 text-left">
                <span className="text-sm">{option.label}</span>
                <span className="text-muted-foreground text-xs">
                  {option.description}
                </span>
              </div>
            </button>
          ))}
      </div>
    </div>
  );
};

export default AgentDefaultOptions;
