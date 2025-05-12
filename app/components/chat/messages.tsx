import React, { useEffect } from "react";
import { type Message as MessageType } from "ai";
import Message from "./message";
import useScrollToBottom from "~/hooks/useScrollBottom";
import { ArrowDown } from "react-feather";

interface MessagesProps {
  messages: MessageType[];
  toolNames: Record<string, string>;
  error?: string;
  showMessageToolBar?: boolean;
  avatarURL: string;
  children?: React.ReactNode;
  status?: string;
}

const Messages: React.FC<MessagesProps> = ({
  messages,
  toolNames,
  error,
  avatarURL,
  status,
}) => {
  const {
    containerRef,
    endRef,
    scrollToBottom,
    hasSentMessage,
    scrollPadding,
    canScrollDown,
  } = useScrollToBottom<HTMLDivElement>(status);
  useEffect(() => {
    if (status === "submitted") {
      scrollToBottom();
    }
  }, [status]);
  return (
    <div className="oak-chat__messages-container-wrapper">
      <div className={"oak-chat__messages"} ref={containerRef}>
        <div className="oak-chat__messages-container">
          {messages.map((message, index) => (
            <Message
              key={message.id || index}
              message={message}
              toolNames={toolNames}
              avatarURL={avatarURL}
              requiresScrollPadding={
                hasSentMessage && index === messages.length - 1
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
          <p className="oak-chat__thinking-message">
            Thinking
            <span className="oak-chat__thinking-dots" />
          </p>
        )}

        <div ref={endRef} className={"oak-chat__scroll-end"} />
      </div>
      <div
        className="oak-chat__scroll-down-indicator"
        style={{
          opacity: canScrollDown ? 1 : 0,
        }}
      >
        <ArrowDown />
      </div>
    </div>
  );
};

export default Messages;
