import React from "react";
import { type Message as MessageType } from "ai";
import Message from "./message";
import useScrollToBottom from "~/hooks/useScrollBottom";

interface MessagesProps {
  messages: MessageType[];
  toolNames: Record<string, string>;
  error?: string;
  showMessageToolBar?: boolean;
  avatarURL: string;
  children?: React.ReactNode;
}

const Messages: React.FC<MessagesProps> = ({
  messages,
  toolNames,
  error,
  avatarURL,
  children,
}) => {
  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>();
  return (
    <div className={"oak-chat__messages"}>
      <div ref={containerRef}>
        {messages.map((message, index) => (
          <Message
            key={message.id || index}
            message={message}
            toolNames={toolNames}
            avatarURL={avatarURL}
          />
        ))}
      </div>
      {error && (
        <div className="oak-chat__error-container">
          <p className="oak-chat__error-message">{error}</p>
        </div>
      )}
      {children}
      <div ref={endRef} className={"oak-chat__scroll-end"} />
    </div>
  );
};

export default Messages;
