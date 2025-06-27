import "../chat/chat.scss";
import React, { useEffect, useRef, useState } from "react";
import { useChat, type Message } from "@ai-sdk/react";
import Messages from "../chat/messages";
import { type ChatSettings } from "../../types/chat";
import ChatInput from "../chat/chatInput";
import { initialChatSettings } from "../../constants/chat";
import type { AgentSettings } from "~/types/agentSetting";
import type { ToolResult } from "ai";
import "./inventAgent.scss";
import type { PluginType } from "~/types/plugins";

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
  onAgentInventorResult?: (result: AgentInventorToolResult) => void;
}

export type AgentInventorToolResult = {
  name: string;
  description: string;
  systemPrompt: string;
  needsKnowledgeBase: boolean;
  shouldCaptureFeedback: boolean;
  shouldTrackConversation: boolean;
  plugins: PluginType[];
  recommendedActivePlugins: string[];
};

const AgentInventorToolComponent = (
  props: ToolResult<
    "__agentInventor",
    { specification: string },
    AgentInventorToolResult
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

const InventAgentChat = (props: ChatProps & { initialPrompt?: string }) => {
  const { messages, status, error, handleInputChange, handleSubmit } = useChat({
    api: `/api/invent`,
  });
  const { initialPrompt } = props;

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

  useEffect(() => {
    console.log("initialPrompt");
    if (initialPrompt) {
      console.log("Initial prompt provided:", initialPrompt, messages);
      if (messages.length === 0) {
        // If there are no messages, we can add the initial prompt
        handleInputChange({
          target: { value: initialPrompt },
        } as React.ChangeEvent<HTMLTextAreaElement>);
        handleSubmit(
          new Event("submit") as unknown as React.FormEvent<HTMLFormElement>,
        );
      }
    }
  }, [initialPrompt, handleInputChange, handleSubmit, messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage &&
      props.onAgentInventorResult &&
      lastMessage.role === "assistant" &&
      lastMessage.parts?.some(
        (part) =>
          part.type === "tool-invocation" &&
          part.toolInvocation.toolName === "__agentInventor",
      )
    ) {
      const toolResult = lastMessage.parts?.find(
        (p) =>
          p.type === "tool-invocation" &&
          p.toolInvocation.toolName === "__agentInventor",
      );
      if (!toolResult) return;
      if (toolResult.type !== "tool-invocation") return;
      if (toolResult.toolInvocation.state !== "result") return;
      const result = toolResult.toolInvocation
        .result as AgentInventorToolResult;

      props.onAgentInventorResult(result);
    }
  }, [messages]);

  return (
    <div id="oak-chat-container" className={`oak-chat max-w-full`}>
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
