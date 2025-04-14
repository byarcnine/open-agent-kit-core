import Markdown from "react-markdown";
import DOMPurify from "dompurify";
import { Loader } from "react-feather";

const InvokeAgentTool = (params: any) => {
  const result = params.result as { answer: string; agentName: string };
  return (
    <div className="flex flex-col gap-2 text-sm  text-italic p-2 text-gray-700">
      <p className="text-sm text-gray-800">
        Sending message to agent ({params.args.agentId}):{" "}
      </p>
      <p className="text-sm text-gray-500 pl-2 border-l-2 border-gray-200">
        {params.args.message}
      </p>
      <p className="text-sm text-gray-800">Response from agent: </p>
      {params.result && (
        <div className="pl-2 border-l-2 border-gray-200">
          <Markdown className="text-sm text-gray-500">
            {DOMPurify.sanitize(result.answer)}
          </Markdown>
        </div>
      )}
      {!params.result && <Loader />}
    </div>
  );
};

export default InvokeAgentTool;
