import React from "react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

interface ToggleWithLabelProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  isChecked: boolean;
  onToggle: (checked: boolean) => void;
}

const ToggleWithLabel: React.FC<ToggleWithLabelProps> = React.memo(
  ({ icon, title, description, isChecked, onToggle }) => {
    return (
      <div className="flex gap-3 items-center bg-gray-100 p-4 rounded-2xl">
        {icon && (
          <div className="bg-white rounded-xl aspect-square p-3">{icon}</div>
        )}
        <div className="flex flex-col gap-1">
          <Label htmlFor="toggle">{title}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch
          className="ml-auto"
          id="toggle"
          name="toggle"
          defaultChecked={isChecked}
          onCheckedChange={onToggle}
        />
      </div>
    );
  },
);

export default ToggleWithLabel;
