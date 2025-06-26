import "../chat/chat.scss";
import React, { useRef, useState } from "react";
import { useChat, type Message } from "@ai-sdk/react";
import Messages from "../chat/messages";
import { type ChatSettings } from "../../types/chat";
import ChatInput from "../chat/chatInput";
import { initialChatSettings } from "../../constants/chat";
import type { AgentSettings } from "~/types/agentSetting";
import type { ToolResult } from "ai";

interface ChatProps {
  onConversationStart?: (conversationId: string) => void;
  onMessage?: (messages: Message[]) => void;
  initialMessages?: Message[];
  initialConversationId?: string;
  disableInput?: boolean;
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

const AgentInventorToolComponent = (
  props: ToolResult<
    "__agentInventor",
    { specification: string },
    { name: string; description: string; systemPrompt: string }
  >,
) => {
  return (
    <div>
      <h3>Agent Inventor</h3>
      <p>Name: {props.result?.name}</p>
      <p>Description: {props.result?.description}</p>
      <p>System Prompt: {props.result?.systemPrompt}</p>
    </div>
  );
};

const InventAgentChat = (props: ChatProps) => {
  const { messages, status, error, handleInputChange, handleSubmit } = useChat({
    api: `/api/invent`,
  });
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    handleInputChange(e);
  };
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    handleSubmit(e);
    setInput("");
  };
  return (
    <div id="oak-chat-container" className={`oak-chat`}>
      <>
        <Messages
          messages={messages}
          error={error?.message}
          status={status}
          anchorToBottom={props.anchorToBottom}
          toolNames={{
            __agentInventor: "Agent Inventor",
          }}
          avatarURL={`/assets/oak_leaf.svg`}
          toolComponents={{
            __agentInventor: AgentInventorToolComponent,
          }}
        />
      </>

      <>
        <ChatInput
          handleInputChange={onChange}
          handleKeyDown={() => {}}
          handleFormSubmit={onSubmit}
          handleFileButtonClick={() => {}}
          handleFileInputChange={() => {}}
          files={[]}
          input={input}
          supportedFileTypes={[]}
          chatSettings={initialChatSettings}
          textareaRef={textAreaRef as React.RefObject<HTMLTextAreaElement>}
          fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
        />
      </>
    </div>
  );
};

export default InventAgentChat;
