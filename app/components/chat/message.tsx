import React, { useContext, useState } from "react";
import { type Message as MessageType } from "ai";
import { Avatar } from "./avatar";
import { toolComponents } from "~/lib/tools/toolComponents";
import { FileText, Copy, Check, Terminal } from "react-feather";
import { openBase64Pdf } from "~/lib/utils";
import { ChatContext } from "./chat.client";
import MarkdownViewer from "./markdownViewer";

const formatValue = (value: any) => {
  switch (typeof value) {
    case "string":
      // try to parse value as json
      try {
        const parsedValue = JSON.parse(value);
        return formatValue(parsedValue);
      } catch (error) {
        return value;
      }
    case "object":
      return (
        <div>
          {Object.entries(value).map(([key, value]) => {
            return (
              <div key={key}>
                <span>{key}: </span>
                <span>{formatValue(value)}</span>
              </div>
            );
          })}
        </div>
      );
    default:
      return String(value);
  }
};

interface MessageProps {
  message: MessageType;
  toolNames: Record<string, string>;
  avatarURL: string;
}

const Message: React.FC<MessageProps> = React.memo(
  ({ message, toolNames, avatarURL }) => {
    const [copied, setCopied] = useState(false);
    const { chatSettings } = useContext(ChatContext);
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
            <img src={avatarURL} alt="OAK Logo" />
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
              const isDefaultTool =
                part.toolInvocation.toolName.startsWith("default__");
              const isMCPTool = !part.toolInvocation.toolName.includes("__");
              const hideDefaultTool =
                isDefaultTool && !chatSettings?.showDefaultToolsDebugMessages;
              if (isMCPTool && chatSettings?.showDefaultToolsDebugMessages) {
                return (
                  <div
                    key={part.toolInvocation.toolCallId}
                    className="oak-chat__message-tool-invocations"
                  >
                    <span className="oak-chat__message-tool-invocations-marker">
                      <Terminal />
                      {part.toolInvocation.toolName}
                    </span>
                    <div className="oak-chat__message-tool-invocations-mcp-content">
                      <div>
                        {Object.entries(part.toolInvocation.args).map(
                          ([key, value]: [string, any]) => {
                            return (
                              <div
                                className="oak-chat__message-tool-invocations-mcp-content-item"
                                key={key}
                              >
                                <span>{key}:</span>
                                <span>{formatValue(value)}</span>
                              </div>
                            );
                          },
                        )}
                      </div>
                      <div>
                        {part.toolInvocation.state === "result" &&
                          part.toolInvocation.result.content.map(
                            (result: any) => {
                              if (result.type === "text") {
                                return (
                                  <div key={result.id}>
                                    <span>{formatValue(result.text)}</span>
                                  </div>
                                );
                              }
                              return null;
                            },
                          )}
                      </div>
                    </div>
                  </div>
                );
              }
              if (!ToolComponent || hideDefaultTool) return null;
              return (
                <div
                  key={part.toolInvocation.toolCallId}
                  className="oak-chat__message-tool-invocations"
                >
                  <span className="oak-chat__message-tool-invocations-marker">
                    <Terminal />
                    {toolNames[part.toolInvocation.toolName]}
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
                  } relative group`}
                >
                  <MarkdownViewer text={part.text} />
                  {chatSettings?.showMessageToolBar &&
                    message.role === "assistant" && (
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
