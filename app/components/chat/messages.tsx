import React from "react";
import { type Message as MessageType } from "ai";
import Message from "./message";
import useScrollToBottom from "~/hooks/useScrollBottom";

interface MessagesProps {
  messages: MessageType[];
  toolNames: Record<string, string>;
  error?: string;
}

const Messages: React.FC<MessagesProps> = ({ messages, toolNames, error }) => {
  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <div className={"oak-chat__messages"}>
      <div ref={containerRef}>
        {messages.map((message) => (
          <Message key={message.id} message={message} toolNames={toolNames} />
        ))}
        <div ref={endRef} className={"oak-chat__scroll-end"} />
      </div>
      {error && (
        <div className="oak-chat__error-container">
          <p className="oak-chat__error-message">{error}</p>
        </div>
      )}
    </div>
  );
};

export default Messages;
