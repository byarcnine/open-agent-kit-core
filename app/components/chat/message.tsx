import React, { useContext, useState } from "react";
import { type Message as MessageType } from "ai";
import { Avatar } from "./avatar";
import { toolComponents } from "../../lib/tools/toolComponents";
import { openBase64Pdf } from "../../lib/utils";
import {
  FileText,
  Copy,
  Check,
  Terminal,
  ThumbsUp,
  ThumbsDown,
} from "react-feather";
import { ChatContext } from "./chat.client";
import MarkdownViewer from "./markdownViewer";
import { getApiUrl } from "./utils";

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
  requiresScrollPadding?: boolean;
  scrollPadding?: number;
}

const Message: React.FC<MessageProps> = React.memo(
  ({ message, toolNames, avatarURL, requiresScrollPadding, scrollPadding }) => {
    const [copied, setCopied] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const { chatSettings, agentSettings, conversationId, isEmbed, apiUrl } =
      useContext(ChatContext);

    const { captureFeedback } = agentSettings;

    const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
      });
    };

    const handleCaptureFeedback = (isNegative: boolean, feedback: string) => {
      if (!captureFeedback || feedbackSubmitted || !conversationId) return;
      const body = {
        feedback,
        feedbackType: "user_feedback",
        sentiment: isNegative ? "negative" : "positive",
        conversationId,
      };

      const route = `${getApiUrl(isEmbed, apiUrl)}/api/feedback`;

      fetch(route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to submit feedback");
          }
          setFeedbackSubmitted(true);
          return response.json();
        })
        .catch((error) => {
          console.error("Error submitting feedback:", error);
        });
    };

    const isUserMessage = message.role === "user";

    return (
      <div
        className={`oak-chat__message oak-chat__message--${
          isUserMessage ? "user" : "assistant"
        }`}
        style={{
          minHeight: requiresScrollPadding ? scrollPadding : undefined,
        }}
      >
        {!isUserMessage && (
          <Avatar className="oak-chat__message-avatar">
            <img
              className="oak-chat__message-avatar-image"
              src={avatarURL}
              alt="OAK Logo"
            />
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
              if (isMCPTool) {
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
                  {!isUserMessage && <MarkdownViewer text={part.text} />}
                  {isUserMessage && (
                    <div className="oak-chat__message-content-container-text">
                      {part.text}
                    </div>
                  )}
                  {chatSettings?.showMessageToolBar &&
                    message.role === "assistant" && (
                      <div className="oak-chat__message-content-actions-container">
                        <button
                          onClick={() => handleCopy(part.text)}
                          className="oak-chat__message-content--copy-button"
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        {captureFeedback && (
                          <div className="oak-chat__message-content--reaction-buttons">
                            <div
                              className={`oak-chat__message-content--feedback-submitted ${
                                feedbackSubmitted ? "active" : ""
                              }`}
                            >
                              Thank you for your feedback!
                            </div>

                            <button
                              disabled={feedbackSubmitted}
                              onClick={() =>
                                handleCaptureFeedback(false, part.text)
                              }
                              className="oak-chat__message-content--copy-button"
                            >
                              <ThumbsUp size={16} />
                            </button>

                            <button
                              disabled={feedbackSubmitted}
                              onClick={() =>
                                handleCaptureFeedback(true, part.text)
                              }
                              className="oak-chat__message-content--copy-button"
                            >
                              <ThumbsDown size={16} />
                            </button>
                          </div>
                        )}
                      </div>
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
