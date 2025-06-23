import React from "react";
import { type Message as MessageType } from "ai";
import Message from "./message";
import { mergeRefs, useScrollPadding } from "../../hooks/useScrollPadding";
import { ArrowDown } from "react-feather";
import { type UseChatHelpers } from "@ai-sdk/react";
import { cn } from "../../lib/utils";
import { useStickToBottom } from "use-stick-to-bottom";

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
    scrollRef,
    contentRef,
    isAtBottom: autoScrollIsAtBottom,
  } = useStickToBottom();
  const {
    messagesContainerRef,
    scrollPadding,
    isAtBottom: manualScrollIsAtBottom,
    scrollToBottom,
  } = useScrollPadding<HTMLDivElement>(status, anchorToBottom);
  const isAtBottom = anchorToBottom
    ? autoScrollIsAtBottom
    : manualScrollIsAtBottom;
  return (
    <div className="oak-chat__messages-container-wrapper">
      <div
        className={cn("oak-chat__messages", "scrollRef")}
        ref={mergeRefs(
          anchorToBottom ? (scrollRef as React.Ref<HTMLDivElement>) : null,
          messagesContainerRef,
        )}
      >
        <div
          className="oak-chat__messages-container contentRef"
          ref={anchorToBottom ? contentRef : null}
        >
          {messages.map((message, index) => (
            <Message
              key={message.id || index}
              message={message}
              toolNames={toolNames}
              avatarURL={avatarURL}
              requiresScrollPadding={
                !anchorToBottom &&
                index === messages.length - 1 &&
                message.role !== "user"
              }
              scrollPadding={scrollPadding}
            />
          ))}
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
        </div>
      </div>
      <button
        onClick={() => scrollToBottom()}
        className="oak-chat__scroll-down-indicator"
        style={{
          opacity: isAtBottom ? 0 : 1,
        }}
      >
        <ArrowDown />
      </button>
    </div>
  );
};

export default React.memo(Messages);
