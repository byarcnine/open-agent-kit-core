import React from "react";

interface NoDataCardProps {
  headline?: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
}

const NoDataCard: React.FC<NoDataCardProps> = (props) => {
  return (
    <div
      className={`${props.className} rounded-md border bg-card text-card-foreground shadow px-6 py-6 md:py-20 text-center`}
    >
      <img src="/assets/logo.svg" alt="No data" className="mx-auto w-10 mb-4" />
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
