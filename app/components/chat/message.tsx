import React, { useState } from "react";
import Markdown from "react-markdown";
import DOMPurify from "dompurify";
import { type Message as MessageType } from "ai";
import { Avatar, AvatarFallback } from "./avatar";
import { toolComponents } from "~/lib/tools/toolComponents";
import { FileText, Copy, Check } from "react-feather";
import { openBase64Pdf } from "~/lib/utils";

interface MessageProps {
  message: MessageType;
  toolNames: Record<string, string>;
  showMessageToolBar: boolean;
}

const Message: React.FC<MessageProps> = React.memo(
  ({ message, toolNames, showMessageToolBar }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
      });
    };

    return (
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
          <div className="oak-chat__message-content-container-attachments">
            {message?.experimental_attachments?.map((attachment, index) => {
              return (
                <div
                  key={index}
                  className="oak-chat__message-content-container-attachments-attachment"
                >
                  {attachment.contentType?.includes("image") && (
                    <img
                      className="oak-chat__message-content-container-attachments-attachment--image"
                      src={attachment.url}
                      alt={attachment.name}
                    />
                  )}
                  {attachment.contentType?.includes("pdf") && (
                    <a
                      onClick={() => openBase64Pdf(attachment.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="oak-chat__file-thumbnails__item--pdf"
                    >
                      <div className="oak-chat__file-thumbnails__item--pdf-icon">
                        <FileText size={20} />
                      </div>
                      <div>
                        <span>{attachment.name}</span>
                        <span>PDF</span>
                      </div>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          {message.parts?.map((part, index) => {
            if (part.type === "tool-invocation") {
              const ToolComponent =
                toolComponents[part.toolInvocation.toolName];
              return (
                <div
                  key={part.toolInvocation.toolCallId}
                  className="oak-chat__message-tool-invocations"
                >
                  <span className="oak-chat__message-tool-invocations-marker">
                    using tool "{toolNames[part.toolInvocation.toolName]}"
                  </span>
                  {ToolComponent && <ToolComponent {...part.toolInvocation} />}
                  {!ToolComponent && (
                    <p>
                      {part.toolInvocation.state === "result" &&
                        part.toolInvocation.result.content[0].text}
                    </p>
                  )}
                </div>
              );
            }
            if (part.type === "text" && part.text) {
              return (
                <div
                  key={index}
                  className={`oak-chat__message-content oak-chat__message-content--${
                    message.role === "user" ? "user" : "assistant"
                  } relative group`}
                >
                  <Markdown>{DOMPurify.sanitize(part.text)}</Markdown>
                  {showMessageToolBar && message.role === "assistant" && (
                    <button
                      onClick={() => handleCopy(part.text)}
                      className="copy-button opacity-30 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  )}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  },
);

export default Message;
