import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Plus } from "react-feather";
import { Form } from "react-router";
import { useEffect, useState } from "react";
import slugify from "slugify";
import InventAgent from "./inventAgent";
import AgentDefaultOptions from "./agentDefaultOptions";

const CreateAgentDialog = ({
  errors,
}: {
  errors:
    | { name?: string[] | undefined; slug?: string[] | undefined }
    | undefined;
}) => {
  const [slugFromName, setSlugFromName] = useState("");
  const [name, setName] = useState("");
  const [isSlugDirty, setIsSlugDirty] = useState(false);

  useEffect(() => {
    if (name) {
      setSlugFromName(
        slugify(name, {
          lower: true,
          strict: true,
          remove: /[*+~.()'"!:@\&]/g,
        }),
      );
    }
  }, [name]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">
          <Plus className="h-4 w-4" />
          New Agent
        </Button>
      </DialogTrigger>
      <DialogContent maxWidth="3xl">
        <DialogHeader>
          <DialogTitle>Create new Agent</DialogTitle>
        </DialogHeader>
        <InventAgent />

        <div className="border-t " />
        <AgentDefaultOptions />
        {false && (
          <Form method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name*</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Enter a unique name for your agent."
                onChange={(e) => {
                  setName(e.target.value);
                }}
              />
              {errors?.name && (
                <p className="text-sm text-destructive">{errors.name[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Agent Slug*</Label>
              <Input
                id="slug"
                name="slug"
                required
                value={!isSlugDirty ? slugFromName : undefined}
                pattern="^[a-z0-9-]+$"
                placeholder="e.g., my-agent-name"
                onChange={(e) => {
                  setIsSlugDirty(true);
                }}
              />
              {errors?.slug && (
                <p className="text-sm text-destructive">{errors.slug[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Optional agent description"
              />
            </div>
            <Button type="submit" variant="default" className="w-full">
              Create Agent
            </Button>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateAgentDialog;
