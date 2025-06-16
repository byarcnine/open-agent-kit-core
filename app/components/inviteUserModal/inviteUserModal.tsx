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
import Checkbox from "~/components/ui/checkbox";
import { useState } from "react";
import type { PermissionGroup } from "@prisma/client";

export const InviteUserModal = ({
  error,
  permissionGroups,
}: {
  error?: string | null;
  permissionGroups: PermissionGroup[];
}) => {
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  const handleGroupToggle = (groupId: string) => {
    const newSelectedGroups = new Set(selectedGroups);
    if (newSelectedGroups.has(groupId)) {
      newSelectedGroups.delete(groupId);
    } else {
      newSelectedGroups.add(groupId);
    }
    setSelectedGroups(newSelectedGroups);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a User</DialogTitle>
        </DialogHeader>
        <Form reloadDocument method="post" className="space-y-4">
          <input type="hidden" name="intent" value="invite" />
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email address"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Permission Groups</Label>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {permissionGroups.map((group) => (
                <div key={group.id} className="flex items-start space-x-3">
                  <Checkbox
                    checked={selectedGroups.has(group.id)}
                    onCheckedChange={() => handleGroupToggle(group.id)}
                    label=""
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{group.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {group.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {selectedGroups.size === 0 && (
              <p className="text-sm text-destructive">
                Please select at least one permission group
              </p>
            )}
            {Array.from(selectedGroups).map((groupId) => (
              <input
                key={groupId}
                type="hidden"
                name="permissionGroupIds"
                value={groupId}
              />
            ))}
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <div className="flex flex-wrap sm:justify-end gap-4 pt-4">
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={selectedGroups.size === 0}>
              Send Invitation
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
