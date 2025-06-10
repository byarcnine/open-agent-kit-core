import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Button } from "~/components/ui/button";
import { ChevronDown } from "react-feather";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colorPalette: string[];
}

const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(({ value, onChange, colorPalette }, ref) => {
    return (
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            variant="outline"
            className="flex items-center px-2 py-1 rounded-xl border"
            style={{ backgroundColor: value }}
          >
            <span className="mr-2 text-black">Color</span>
            <ChevronDown className="w-4 h-4 text-black" />
          </Button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content className="p-2 bg-white rounded-xl border w-40">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border ${
                    value === color ? "ring-2 ring-gray-600" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onChange(color)}
                  aria-label={`Select ${color}`}
                />
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">Hex:</span>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full p-1 border rounded-xl text-sm"
                placeholder="#FFFFFF"
              />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }
);

ColorPicker.displayName = "ColorPicker";

export default ColorPicker;
