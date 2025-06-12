import React from "react";
import { cn } from "~/lib/utils";

interface BubbleProps {
  isActive: boolean;
  className?: string;
}

const Bubble: React.FC<BubbleProps> = ({ isActive, className }) => {
  return (
    <div
      className={cn(className, "w-3 h-3 rounded-full overflow-hidden", {
        "bg-green-500": isActive,
        "bg-yellow-500": !isActive,
      })}
    />
  );
};

export default Bubble;
