import React from "react";
import { AlertTriangle } from "react-feather";

interface WarningProps {
  headline?: string;
  description: string;
  className?: string;
}

const Warning: React.FC<WarningProps> = (props) => {
  return (
    <div
      className={`${props.className} inline-flex backdrop-blur-xl rounded-2xl shadow-sm border bg-white text-card-foreground p-2 gap-2 items-center w-auto `}
    >
      <AlertTriangle className="w-6 h-6 text-yellow-500" />
      <div className="flex flex-col">
        {props.headline && (
          <h3 className="text-sm font-medium">{props.headline}</h3>
        )}
        <p className="text-xs text-muted-foreground">{props.description}</p>
      </div>
    </div>
  );
};

export default Warning;
