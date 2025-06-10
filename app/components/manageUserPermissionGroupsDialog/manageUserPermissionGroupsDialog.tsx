import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import Checkbox from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { useFetcher } from "react-router";
import { Settings } from "react-feather";

interface User {
  id: string;
  name: string;
  email: string;
  userPermissionGroups: {
    id: string;
    permissionGroup: {
      id: string;
      name: string;
    };
  }[];
}

interface PermissionGroup {
  id: string;
  name: string;
  description: string;
}

interface ManageUserPermissionGroupsDialogProps {
  user: User;
  permissionGroups: PermissionGroup[];
}

export function ManageUserPermissionGroupsDialog({
  user,
  permissionGroups,
}: ManageUserPermissionGroupsDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    new Set(user.userPermissionGroups.map((upg) => upg.permissionGroup.id)),
  );
  const fetcher = useFetcher();

  const handleGroupToggle = (groupId: string) => {
    const newSelectedGroups = new Set(selectedGroups);
    if (newSelectedGroups.has(groupId)) {
      newSelectedGroups.delete(groupId);
    } else {
      newSelectedGroups.add(groupId);
    }
    setSelectedGroups(newSelectedGroups);
  };

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("intent", "manageUserPermissionGroups");
    formData.append("userId", user.id);
    formData.append(
      "permissionGroups",
      JSON.stringify(Array.from(selectedGroups)),
    );

    fetcher.submit(formData, { method: "post" });
    setOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset selected groups when opening
      setSelectedGroups(
        new Set(user.userPermissionGroups.map((upg) => upg.permissionGroup.id)),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Permission Groups</DialogTitle>
          <DialogDescription>
            Manage which permission groups {user.name} belongs to.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {permissionGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No permission groups available.
            </p>
          ) : (
            <div className="space-y-3">
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
          )}
        </div>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={fetcher.state === "submitting"}
          >
            {fetcher.state === "submitting" ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
