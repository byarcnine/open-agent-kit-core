import type { ToolResult } from "ai";

export default (
  props: ToolResult<string, { url: string }, { content: string }>,
) => {
  return (
    <div className="text-sm text-gray-500 bg-gray-100 p-2 rounded-md">
      Looking at Website:{" "}
      <a
        href={props.args.url}
        target="_blank"
        className="text-blue-500 underline hover:no-underline cursor-pointer"
        rel="noreferrer"
      >
        {props.args.url}
      </a>
    </div>
  );
};
