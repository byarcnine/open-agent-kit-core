import { tool } from "ai";
import { z } from "zod";
import type { DateTimeToolResult, ToolConfig } from "~/types/tools";

export const name = "Date And Time";
export const description =
  "Use this tool whenever you need to know the current time, date, or day of the week. It returns the current day (e.g., 'Monday'), full date (e.g., 'March 18, 2024'), and time in 12-hour format (e.g., '02:30 PM'). Use this for scheduling, timing, or when discussing current temporal information.";

const dateTimeAndDay = () =>
  tool({
    description,
    parameters: z.object({}),
    execute: async (): Promise<DateTimeToolResult> => {
      return {
        day: new Date().toLocaleDateString("en-US", { weekday: "long" }),
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    },
  });

export default {
  identifier: "default__dateTimeAndDay",
  name: "Date And Time",
  description:
    "Retrieves date and time - enables the model to answer time based questions.",
  tool: dateTimeAndDay,
} satisfies ToolConfig;
