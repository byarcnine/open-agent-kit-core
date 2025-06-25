import { type Message } from "@ai-sdk/react";
import type { AgentSettings } from "./agentSetting";

export interface ChatSettings {
  intro?: {
    title?: string;
    subTitle?: string;
  };
  initialMessage?: string;
  chatInputPlaceholder?: string;
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
  embedSettings?: {
    maintainConversationSession?: number;
    embedWidgetTitle?: string;
  };
}

export enum MessageRole {
  Assistant = "assistant",
  System = "system",
  User = "user",
  Data = "data",
}

export interface ChatProps {
  onConversationStart?: (conversationId: string) => void;
  onMessage?: (messages: Message[]) => void;
  resetConversation?: () => void;
  onFormSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
  initialMessages?: Message[];
  initialConversationId?: string;
  disableInput?: boolean;
  agentId: string;
  apiUrl?: string;
  meta?: object;
  isEmbed?: boolean;
  agentChatSettings?: ChatSettings | null;
  agentSettings?: AgentSettings | null;
  toolNamesList?: Record<string, string>;
  avatarImageURL?: string;
  anchorToBottom?: boolean;
  onEmbedInit?: (chatSettings: ChatSettings) => void;
}
