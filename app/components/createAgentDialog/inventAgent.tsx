import { useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useNavigate } from "react-router";

const InventAgent = ({}) => {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();

  const handleInventAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      console.error("Prompt cannot be empty");
      return;
    }
    console.log("Agent creation logic goes here with prompt:", prompt);
    // push to new route
    navigate(`/invent_agent?prompt=${encodeURIComponent(prompt)}`, {
      replace: true,
    });
  };

  return (
    <form>
      <h3>Invent your Agent</h3>
      <span className="text-muted-foreground text-xs">
        Tell us what you need and we'll build it for you
      </span>
      <div className="flex flex-col">
        <Textarea
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
