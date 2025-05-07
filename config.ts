import type { OAKConfig } from "./app/types/config";
import { openai } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { xai } from "@ai-sdk/xai";
import { anthropic } from "@ai-sdk/anthropic";

const google = createGoogleGenerativeAI();

export default {
  name: "ARC9 Agents",
  models: [
    openai("gpt-4o"),
    openai("gpt-4o-mini"),
    google("gemini-1.5-pro"),
    google("gemini-2.0-flash"),
    xai("grok-2-1212"),
    xai("grok-beta"),
    anthropic("claude-3-5-sonnet-latest"),
    anthropic("claude-3-7-sonnet-latest"),
  ],
} satisfies OAKConfig;
