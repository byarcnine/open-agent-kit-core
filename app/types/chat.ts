export interface ChatSettings {
  intro?: {
    title?: string;
    subTitle?: string;
  };
  initialMessage?: string;
  suggestedQuestions?: string[];
  textAreaInitialRows?: number;
  footerNote?: string;
  enableFileUpload?: boolean;
  supportedFileTypes?: string[];
  showMessageToolBar?: boolean;
  showDefaultToolsDebugMessages?: boolean;
  openExternalLinksInNewTab?: boolean;
  openInternalLinksInNewTab?: boolean;
  openYoutubeVideosInIframe?: boolean;
  customCSS?: string;
  maintainConversationSession?: number;
}

export enum MessageRole {
  Assistant = "assistant",
  System = "system",
  User = "user",
  Data = "data",
}
