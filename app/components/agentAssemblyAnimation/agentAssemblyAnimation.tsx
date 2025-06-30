import React, { useEffect, useState } from "react";
import { Settings, Zap } from "react-feather";
import { Button } from "../ui/button";

interface AgentAssemblyAnimationProps {
  onComplete: () => void;
}

const AgentAssemblyAnimation: React.FC<AgentAssemblyAnimationProps> = ({
  onComplete,
}) => {
  const [isAssembling, setIsAssembling] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const steps = [
    {
      text: "Launching agent builder...",
      duration: 2500,
      color: "from-blue-400 to-blue-600",
    },
    {
      text: "Activating tools & capabilities...",
      duration: 2000,
      color: "from-purple-400 to-purple-600",
    },
    {
      text: "Enabling plugins and integrations...",
      duration: 2000,
      color: "from-green-400 to-green-600",
    },
    {
      text: "Calibrating intelligence...",
      duration: 2500,
      color: "from-yellow-400 to-orange-500",
    },
    {
      text: "Finalizing assembly...",
      duration: 1000,
      color: "from-emerald-400 to-emerald-600",
    },
  ];

  const startAssembly = () => {
    setIsAssembling(true);
    setCurrentStep(0);
    setIsComplete(false);

    let stepIndex = 0;
    const runStep = () => {
      if (stepIndex < steps.length) {
        setCurrentStep(stepIndex);
        setTimeout(() => {
          stepIndex++;
          if (stepIndex < steps.length) {
            runStep();
          } else {
            setTimeout(() => {
              setIsAssembling(false);
              setIsComplete(true);
            }, 800);
          }
        }, steps[stepIndex].duration);
      }
    };

    runStep();
  };

  useEffect(() => {
    startAssembly();
  }, []);

  const currentStepData = steps[currentStep] || steps[0];

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 w-96 text-center border border-gray-200 shadow-2xl relative overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0 opacity-20">
          <div
            className={`absolute inset-0 bg-gradient-to-r ${isAssembling ? currentStepData.color : "from-blue-400 to-blue-600"} animate-pulse rounded-2xl`}
          ></div>
        </div>

        <div className="relative z-10">
          {isComplete ? (
            /* Complete State */
            <div>
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center relative animate-bounce">
                <Zap className="w-10 h-10 text-white" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full animate-ping opacity-30"></div>
              </div>
              <h3 className="text-gray-900 text-xl font-bold mb-2">
                Agent ready!
              </h3>
              <p className="text-muted-foreground text-sm mb-6">
                Your AI assistant is fully assembled and is ready to assist you!
                Click the button to launch it.
              </p>

              <Button variant="default" className="w-full" onClick={onComplete}>
                Launch Agent
              </Button>
            </div>
          ) : (
            /* Assembly State */
            <div>
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
                <div
                  className={`absolute inset-0 border-4 bg-gradient-to-r ${currentStepData.color} rounded-full animate-spin`}
                  style={{
                    clipPath: "polygon(50% 0%, 100% 0%, 100% 50%, 50% 50%)",
                    borderRadius: "50%",
                  }}
                ></div>
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <Settings className="w-8 h-8 text-gray-700 animate-pulse" />
                </div>
              </div>

              <p className="text-gray-900 text-lg mb-6 min-h-[28px]">
                {currentStepData.text}
              </p>

              {/* Progress segments */}
              <div className="flex gap-1 mb-4">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                      index <= currentStep
                        ? `bg-gradient-to-r ${currentStepData.color}`
                        : "bg-gray-200"
                    }`}
                  ></div>
                ))}
              </div>

              <p className="text-gray-500 text-sm">
                Step {currentStep + 1} of {steps.length}
              </p>

              {/* Floating dots animation */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`absolute w-2 h-2 bg-gradient-to-r ${currentStepData.color} rounded-full animate-ping opacity-60`}
                    style={{
                      left: `${Math.cos((i * 60 * Math.PI) / 180) * 60}px`,
                      top: `${Math.sin((i * 60 * Math.PI) / 180) * 60}px`,
                      animationDelay: `${i * 200}ms`,
                      animationDuration: "2s",
                    }}
                  ></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentAssemblyAnimation;
