import React from "react";
import Markdown from "react-markdown";
import DOMPurify from "dompurify";
import { type Message as MessageType } from "ai";
import { Avatar, AvatarFallback } from "./avatar";
import { toolComponents } from "~/lib/tools/toolComponents";

interface MessageProps {
  message: MessageType;
  toolNames: Record<string, string>;
}

const Message: React.FC<MessageProps> = React.memo(({ message, toolNames }) => (
  <div
    className={`oak-chat__message oak-chat__message--${
      message.role === "user" ? "user" : "assistant"
    }`}
  >
    {message.role === "assistant" && (
      <Avatar className="oak-chat__message-avatar">
        <AvatarFallback className="oak-chat__message-avatar-fallback">
          OAK
        </AvatarFallback>
      </Avatar>
    )}
    <div className="oak-chat__message-content-container">
      {message.parts?.map((part, index) => {
        if (part.type === "tool-invocation") {
          const ToolComponent = toolComponents[part.toolInvocation.toolName];
          if (!ToolComponent) return null;
          return (
            <div
              key={part.toolInvocation.toolCallId}
              className="oak-chat__message-tool-invocations"
            >
              <span className="oak-chat__message-tool-invocations-marker">
                using tool "{toolNames[part.toolInvocation.toolName]}"
              </span>
              <ToolComponent {...part.toolInvocation} />
            </div>
          );
        }
        if (part.type === "text" && part.text) {
          return (
            <div
              key={index}
              className={`oak-chat__message-content oak-chat__message-content--${
                message.role === "user" ? "user" : "assistant"
              }`}
            >
              <Markdown>{DOMPurify.sanitize(part.text)}</Markdown>
            </div>
          );
        }
        return null;
      })}
    </div>
  </div>
));

export default Message;
