import React, { useEffect, useState } from "react";
import { Terminal, Tool, Cpu, CheckCircle, Zap, Settings } from "react-feather";
import { Button } from "../ui/button";

interface AgentAssemblyAnimationProps {
  onComplete: () => void;
}

const AgentAssemblyAnimation: React.FC<AgentAssemblyAnimationProps> = ({
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    {
      text: "Launching agent builder...",
      duration: 2000,
      icon: Terminal,
    },
    {
      text: "Activating tools & capabilities...",
      duration: 1500,
      icon: Tool,
    },
    {
      text: "Enabling plugins and integrations...",
      duration: 1500,
      icon: Settings,
    },
    {
      text: "Calibrating intelligence...",
      duration: 2000,
      icon: Cpu,
    },
    {
      text: "Finalizing assembly...",
      duration: 500,
      icon: CheckCircle,
    },
  ];

  useEffect(() => {
    let stepIndex = 0;

    const runStep = () => {
      if (stepIndex < steps.length) {
        setCurrentStep(stepIndex);
        setTimeout(() => {
          stepIndex++;
          if (stepIndex < steps.length) {
            runStep();
          } else {
            setTimeout(() => setIsComplete(true), 800);
          }
        }, steps[stepIndex].duration);
      }
    };

    runStep();
  }, []);

  return (
        <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        One moment while we assemble your agent...
      </h2>

      <ul className="space-y-3 mb-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isVisible = index <= currentStep || isComplete;
          const isDone = index < currentStep || isComplete;

          return (
            <li
              key={index}
              className={`flex items-center gap-3 transition-all duration-500 transform ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 -translate-y-2"
              }`}
            >
              {isComplete || isDone ? (
                <div className="w-5 h-5 rounded-sm bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              ) : (
                <Icon
                  className={`w-5 h-5 ${
                    index === currentStep
                      ? "text-blue-500 animate-pulse"
                      : "text-gray-300"
                  }`}
                />
              )}
              <span
                className={`text-sm ${
                  isComplete || isDone ? "text-gray-600" : "text-gray-800"
                }`}
              >
                {step.text}
              </span>
            </li>
          );
        })}
      </ul>

      {isComplete && (
        <div className="mt-6 flex flex-col">
          <Button
              variant="default"
            onClick={onComplete}
          >
            Launch Agent
          </Button>
        </div>
      )}
    </div>
  );
};

export default AgentAssemblyAnimation;
