import { type TextUIPart, type ReasoningUIPart, type ToolInvocationUIPart } from "@ai-sdk/ui-utils";

export interface ChatSettings {
  intro?: {
    title?: string;
    subTitle?: string;
  }
  initialMessage?: string;
  suggestedQuestions?: string[];
  textAreaInitialRows?: number;
  footerNote?: string;
  enableFileUpload?: boolean;
}

export enum MessageRole {
  Assistant = "assistant",
  System = "system",
  User = "user",
  Data = "data",
}
