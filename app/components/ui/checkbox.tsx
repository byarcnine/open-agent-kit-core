import * as React from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "react-feather";

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked, onCheckedChange, label }, ref) => {
    return (
      <div className="flex items-center gap-2">
        <RadixCheckbox.Root
          ref={ref}
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="flex size-[20px] appearance-none items-center justify-center rounded shadow border bg-white outline-none"
        >
          <RadixCheckbox.Indicator className="w-4 h-4">
            <Check className="w-4 h-4" />
          </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        {label && <label>{label}</label>}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
