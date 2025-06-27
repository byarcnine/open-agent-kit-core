import React from "react";
import { cn } from "~/lib/utils";

export interface StepsInterface {
  step: {
    title: string;
  }[];
  currentStep: number;
}

const Steps: React.FC<StepsInterface> = ({ step, currentStep }) => {
  return (
    <div className="w-full">
      <div className="w-full flex items-center gap-2">
        {step.map((s, index) => (
          <div
            key={`step-${s.title}-${index}`}
            className={cn("flex-1 shrink-0 h-1 rounded-lg overflow-hidden", {
              "bg-blue-200": index < currentStep,
              "bg-green-600": index === currentStep,
              "bg-neutral-300": index > currentStep,
            })}
          />
        ))}
      </div>
    </div>
  );
};

export default Steps;
