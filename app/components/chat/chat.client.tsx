import "./chat.scss";
import React, { useEffect, useMemo, useImperativeHandle, forwardRef } from "react";
import { type Message } from "@ai-sdk/react";
import AdviceCards from "./adviceCards";
import Messages from "./messages";
import { type ChatSettings } from "~/types/chat";
import useOakChat from "~/hooks/useOakChat";
import ChatInput from "./chatInput";
import { initialChatSettings } from "~/constants/chat";

interface ChatContextType {
  isEmbed: boolean;
  chatSettings: ChatSettings;
}

export const ChatContext = React.createContext<ChatContextType>({
  isEmbed: false,
  chatSettings: initialChatSettings,
});

export interface ChatRef {
  setInput: (input: string) => void;
}

interface ChatProps {
  onConversationStart?: (conversationId: string) => void;
  onMessage?: (messages: Message[]) => void;
  initialMessages?: Message[];
  initialConversationId?: string;
  disableInput?: boolean;
  agentId: string;
  apiUrl?: string;
  meta?: object;
  isEmbed?: boolean;
  agentChatSettings?: ChatSettings | null;
  toolNamesList?: Record<string, string>;
  avatarImageURL?: string;
  anchorToBottom?: boolean;
  onEmbedInit?: (chatSettings: ChatSettings) => void;
}

const Chat = forwardRef<ChatRef, ChatProps>((props, ref) => {
  const {
    avatar,
    conversationId,
    chatSettings,
    toolNames,
    chatInitialized,
    sessionTokenIsRefreshing,
    messages,
    input,
    status,
    error,
    files,
    handleInputChange,
    handleKeyDown,
    handleFormSubmit,
    handleCardSelect,
    handleFileInputChange,
    handleFileButtonClick,
    clearSelectedFile,
    handleDragOver,
    handleDrop,
    supportedFileTypes,
    textareaRef,
    fileInputRef,
    setInput,
  } = useOakChat(props);

  // Expose setInput function through ref
  useImperativeHandle(ref, () => ({
    setInput: (input: string) => setInput(input),
  }), []);

  const chatContext = useMemo(
    () => ({ isEmbed: !!props.isEmbed, chatSettings }),
    [props.isEmbed, chatSettings],
  );

  useEffect(() => {
    if (props.onMessage) {
      props.onMessage(messages);
    }
  }, [messages?.[messages.length - 1]?.parts?.length]);

  if (!chatInitialized && props.isEmbed) {
    return (
      <div id="oak-chat-container" className="oak-chat">
        <div className="oak-chat__loading-container">
          <img className="oak-chat__loading-logo" src={avatar} alt="Logo" />
          <p className="oak-chat__loading-text">One moment, I'm on it..</p>
        </div>
      </div>
    );
  }

  const suggestedQuestions = chatSettings?.suggestedQuestions ?? [];

  return (
    <ChatContext.Provider value={chatContext}>
      <div
        key={conversationId}
        id="oak-chat-container"
        className={`oak-chat`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {messages.length === 0 ? (
          <div className="oak-chat__empty-state">
            {chatSettings?.intro?.title && (
              <h1 className="oak-chat__empty-state-heading">
                {chatSettings?.intro?.title}
              </h1>
            )}
            {chatSettings?.intro?.subTitle && (
              <p className="oak-chat__empty-state-subheading">
                {chatSettings?.intro?.subTitle}
              </p>
            )}
            {suggestedQuestions.length > 0 && (
              <AdviceCards
                onCardSelect={handleCardSelect}
                questions={suggestedQuestions}
              />
            )}
          </div>
        ) : (
          <>
            <Messages
              toolNames={toolNames}
              messages={messages}
              error={error?.message}
              avatarURL={avatar}
              status={status}
              anchorToBottom={props.anchorToBottom}
            />
          </>
        )}
        {!props.disableInput && (
          <>
            <ChatInput
              files={files}
              input={!sessionTokenIsRefreshing ? input : ""}
              handleInputChange={handleInputChange}
              handleKeyDown={handleKeyDown}
              handleFormSubmit={handleFormSubmit}
              textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
              fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
              supportedFileTypes={supportedFileTypes}
              chatSettings={chatSettings}
              handleFileInputChange={handleFileInputChange}
              handleFileButtonClick={handleFileButtonClick}
              onClearFile={clearSelectedFile}
            />
            {chatSettings?.footerNote && (
              <p className="oak-chat__footer-note">
                {chatSettings?.footerNote}
              </p>
            )}
          </>
        )}
      </div>
    </ChatContext.Provider>
  );
});

export default Chat;
