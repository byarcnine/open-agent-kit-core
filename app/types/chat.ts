export interface ChatSettings {
  intro?: {
    title?: string;
    subTitle?: string;
  };
  initialMessage?: string;
  suggestedQuestions?: string[];
  textAreaInitialRows?: number;
  footerNote?: string;
}

export enum MessageRole {
  Assistant = "assistant",
  System = "system",
  User = "user",
  Data = "data",
}
