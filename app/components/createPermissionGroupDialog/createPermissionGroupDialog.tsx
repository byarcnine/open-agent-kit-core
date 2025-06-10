import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Plus } from "react-feather";
import { Form } from "react-router";
import { Textarea } from "../ui/textarea";

export const CreatePermissionGroupDialog = ({
  error,
}: {
  error?: string | null;
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Permission Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Permission Group</DialogTitle>
        </DialogHeader>
        <Form reloadDocument method="post" className="space-y-4">
          <input type="hidden" name="intent" value="createPermissionGroup" />
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Enter permission group name"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe what this permission group is for"
              required
              rows={3}
            />
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <div className="flex flex-wrap sm:justify-end gap-4 pt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Create Permission Group</Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
