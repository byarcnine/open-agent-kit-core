import React from "react";
import { type Message as MessageType } from "ai";
import Message from "./message";
import useScrollToBottom from "~/hooks/useScrollBottom";
import { ArrowDown } from "react-feather";
import { type UseChatHelpers } from "@ai-sdk/react";
import { cn } from "~/lib/utils";

interface MessagesProps {
  messages: MessageType[];
  toolNames: Record<string, string>;
  error?: string;
  showMessageToolBar?: boolean;
  avatarURL: string;
  children?: React.ReactNode;
  status?: UseChatHelpers["status"];
  anchorToBottom?: boolean;
}

const Messages: React.FC<MessagesProps> = ({
  messages,
  toolNames,
  error,
  avatarURL,
  status,
  anchorToBottom = true, // if true, the scroll will be anchored to the bottom when a new message is being sent. If false the new message gets anchored to the top and overflowing text will be hidden.
}) => {
  const {
    containerRef,
    endRef,
    hasSentMessage,
    scrollPadding,
    canScrollDown,
    scrollToBottom,
  } = useScrollToBottom<HTMLDivElement>(status, anchorToBottom);
  return (
    <div className="oak-chat__messages-container-wrapper">
      <div
        className={cn("oak-chat__messages", {
          "oak-chat__messages--anchor-bottom": anchorToBottom,
        })}
        ref={containerRef}
      >
        <div className="oak-chat__messages-container">
          {messages.map((message, index) => (
            <Message
              key={message.id || index}
              message={message}
              toolNames={toolNames}
              avatarURL={avatarURL}
              requiresScrollPadding={
                hasSentMessage &&
                index === messages.length - 1 &&
                message.role !== "user"
              }
              scrollPadding={scrollPadding}
            />
          ))}
        </div>
        {error && (
          <div className="oak-chat__error-container">
            <p className="oak-chat__error-message">{error}</p>
          </div>
        )}
        {status === "submitted" && (
          <p
            className="oak-chat__thinking-message"
            style={{ minHeight: scrollPadding }}
          >
            Thinking
            <span className="oak-chat__thinking-dots" />
          </p>
        )}

        <div
          ref={endRef}
          className={cn("oak-chat__scroll-end", {
            "oak-chat__scroll-end--anchor-bottom": anchorToBottom,
          })}
        />
      </div>
      <button
        onClick={() => scrollToBottom(true)}
        className="oak-chat__scroll-down-indicator"
        style={{
          opacity: canScrollDown ? 1 : 0,
        }}
      >
        <ArrowDown />
      </button>
    </div>
  );
};

export default Messages;
