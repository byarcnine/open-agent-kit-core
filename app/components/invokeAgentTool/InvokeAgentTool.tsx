import type { ToolResultPart } from "ai";
import Markdown from "react-markdown";
import DOMPurify from "dompurify";

const InvokeAgentTool = (params: any) => {
  const result = params.result as { answer: string; agentName: string };
  if (!params.result) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 text-sm  text-italic p-2 text-gray-700">
      <p className="text-sm text-gray-500">{params.args.message}</p>
      <Markdown>{DOMPurify.sanitize(result.answer)}</Markdown>
      <p>Response from: {result.agentName}</p>
    </div>
  );
};

export default InvokeAgentTool;
