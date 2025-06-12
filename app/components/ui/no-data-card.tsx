import React from "react";
import { Frown } from "react-feather";

interface NoDataCardProps {
  headline?: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
}

const NoDataCard: React.FC<NoDataCardProps> = (props) => {
  return (
    <div
      className={`${props.className} backdrop-blur-xl rounded-2xl shadow-sm border bg-white text-card-foreground px-6 py-6 md:py-20 text-center`}
    >
      <Frown className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      {props.headline && (
        <h3 className="text-xl font-medium mb-2">{props.headline}</h3>
      )}
      <p className="text-base text-muted-foreground">{props.description}</p>
      {props?.children && (
        <div className="mx-auto inline-block mt-4">{props.children}</div>
      )}
    </div>
  );
};

export default NoDataCard;
