import { useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useNavigate } from "react-router";
import { Badge } from "../ui/badge";

const InventAgent = ({}) => {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const defaults = [
    {
      title: "Internal Wiki",
      description:
        "An agent that can answer questions about the internal wiki, including policies, procedures, and documentation.",
    },
    {
      title: "Personal Assistant",
      description:
        "An agent that can help with personal tasks, such as scheduling, reminders, and general assistance.",
    },
    {
      title: "Project Manager",
      description:
        "An agent that can assist with project management tasks, including task tracking, deadline reminders, and team coordination.",
    },
  ];

  const handleInventAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      console.error("Prompt cannot be empty");
      return;
    }
    // push to new route
    navigate(`/space/arc9/invent-agent?prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <form>
      <h3 className="text-muted-foreground text-md max-w-lg">
        Type into the box below to describe the agent you
        want to create or choose a preset.
      </h3>
      <div className="flex flex-wrap gap-2 mt-8">
        {defaults.map((defaultAgent) => (
          <Badge
            key={defaultAgent.title}
            variant="default"
            onClick={() => setPrompt(defaultAgent.description)}
          >
            {defaultAgent.title}
          </Badge>
        ))}
      </div>
      <div className="flex flex-col">
        <Textarea
          value={prompt}
          name="agentDescription"
          placeholder="Describe the agent you want to create. Include its purpose, capabilities, and any specific requirements."
          rows={5}
          className="mt-2"
          required
          onChange={(e) => setPrompt(e.target.value)}
        />
        <Button
          type="submit"
          className="mt-4 ml-auto"
          variant="default"
          disabled={!prompt.trim()}
          onClick={handleInventAgent}
        >
          Invent Agent
        </Button>
      </div>
    </form>
  );
};

export default InventAgent;
