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
import { PlusCircle } from "react-feather";
import { Form } from "react-router";
import { useEffect, useState } from "react";
import slugify from "slugify";

const CreateSpaceDialog = ({
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
        <Button>
          <PlusCircle className="h-4 w-4" />
          New Space
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure New Space</DialogTitle>
        </DialogHeader>
        <Form method="post" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Space Name*</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Enter a unique name for your space."
              onChange={(e) => {
                setName(e.target.value);
              }}
            />
            {errors?.name && (
              <p className="text-sm text-destructive">{errors.name[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Space Slug*</Label>
            <Input
              id="slug"
              name="slug"
              required
              value={!isSlugDirty ? slugFromName : undefined}
              pattern="^[a-z0-9-]+$"
              placeholder="e.g., my-space-name"
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
              placeholder="Optional space description"
            />
          </div>
          <Button type="submit" variant="green" className="w-full">
            Create space
          </Button>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSpaceDialog;
