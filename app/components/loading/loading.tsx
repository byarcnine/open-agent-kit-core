import React from "react";

const Loading: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div
        className="animate-spin rounded-full h-12 w-12 border-4 border-t-green-500 border-neutral-200 box-border"
      ></div>
    </div>
  );
};

export default Loading;
