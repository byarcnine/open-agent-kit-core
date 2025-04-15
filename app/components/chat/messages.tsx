import React from "react";
import { type Message as MessageType } from "ai";
import Message from "./message";
import useScrollToBottom from "~/hooks/useScrollBottom";

interface MessagesProps {
  messages: MessageType[];
  toolNames: Record<string, string>;
  error?: string;
  showMessageToolBar?: boolean;
  avatarURL?: string;
}

const Messages: React.FC<MessagesProps> = ({
  messages,
  toolNames,
  error,
  showMessageToolBar,
  avatarURL,
}) => {
  const [containerRef, endRef] = useScrollToBottom<HTMLDivElement>();

  return (
    <div className={"oak-chat__messages"}>
      <div ref={containerRef}>
        {messages.map((message) => (
          <Message
            showMessageToolBar={showMessageToolBar ?? false}
            key={message.id}
            message={message}
            toolNames={toolNames}
            avatarURL={avatarURL}
          />
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
