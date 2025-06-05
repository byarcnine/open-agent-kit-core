import { Clock } from "react-feather";
import type { DateTimeToolResult } from "../../types/tools";
import "./dateAndTimeTool.scss";

export const DateTimeAndDayTool = (props: { result?: DateTimeToolResult }) => {
  const { date } = props.result || {};
  if (!date) return null;
  return (
    <div className="date-and-time-tool">
      <Clock size={16} />
      <span>{date}</span>
    </div>
  );
};
