const AgentDefaultOptions = ({}) => {
  return (
    <div className="flex flex-col">
      <span className="text-base mb-4">...or choose a starting point</span>
      <div className="flex gap-2">
        <button className="p-2 rounded-lg border hover:bg-neutral-200 transition flex items-center gap-2">
          <div className="flex flex-col gap-1 text-left">
            <span className="text-sm">Use guided setup</span>
            <span className="text-muted-foreground text-xs">
              We will walk you through the process of creating an agent.
            </span>
          </div>
        </button>
        <button className="p-2 rounded-lg border hover:bg-neutral-200 transition flex items-center gap-2">
          <div className="flex flex-col gap-1 text-left">
            <span className="text-sm">Give agent knowledge</span>
            <span className="text-muted-foreground text-xs">
              Upload files and instantly create an agent with the knowledge
            </span>
          </div>
        </button>
        <button className="p-2 rounded-lg border hover:bg-neutral-200 transition flex items-center gap-2">
          <div className="flex flex-col gap-1 text-left">
            <span className="text-sm">Connect tools</span>
            <span className="text-muted-foreground text-xs">
              Microsoft, Slack, ... and more. Connect your tools to your agent.
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default AgentDefaultOptions;
