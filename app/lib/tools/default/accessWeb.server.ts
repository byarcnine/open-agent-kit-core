import { tool } from "ai";
import { z } from "zod";
import axios from "axios";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import type { ToolConfig } from "~/types/tools";

const parameters = z.object({
  url: z.string(),
});

export type AccessWebToolParams = z.infer<typeof parameters>;
export type AccessWebToolResult = {
  content: string;
};

const accessWeb = () =>
  tool({
    description: "Access a website and extract the content",
    parameters,
    execute: async ({ url }): Promise<AccessWebToolResult> => {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      $("script, style").remove();
      const htmlContent = $("body").html() || "";
      const turndownService = new TurndownService();
      const markdownContent = turndownService.turndown(htmlContent);

      return { content: markdownContent };
    },
  });

export default {
  identifier: "accessWeb",
  name: "Access Web",
  description: "Access a website and extract the content",
  tool: accessWeb,
} satisfies ToolConfig;
