import React, {
  useContext,
  useState,
  type DetailedHTMLProps,
  type AnchorHTMLAttributes,
} from "react";
import Markdown from "react-markdown";
import DOMPurify from "dompurify";
import { type Message as MessageType } from "ai";
import { Avatar, AvatarFallback } from "./avatar";
import { toolComponents } from "~/lib/tools/toolComponents";
import { FileText, Copy, Check } from "react-feather";
import { openBase64Pdf } from "~/lib/utils";
import { ChatContext } from "./chat.client";
import type { ChatSettings } from "~/types/chat";

interface MessageProps {
  message: MessageType;
  toolNames: Record<string, string>;
}

const getVideoId = (url: string) => {
  const videoId = url.includes("youtube.com")
    ? new URL(url).searchParams.get("v")
    : url.split("/").pop();
  return videoId;
};

const YouTubeEmbed = ({ url }: { url: string }) => {
  const videoId = getVideoId(url);
  return (
    <div className="block py-6">
      <div className="oak-chat__message-iframe-container">
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};
const renderMarkdownLink = ({
  children,
  href,
  chatSettings,
  ...props
}: DetailedHTMLProps<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
> & { chatSettings: ChatSettings }) => {
  const isYouTubeLink =
    href?.includes("youtube.com") || href?.includes("youtu.be");
  if (isYouTubeLink && chatSettings?.openYoutubeVideosInIframe) {
    return href ? <YouTubeEmbed url={href} /> : null;
  }

  const isExternalLink =
    href?.includes("http") && !href?.includes(window.location.hostname);
  const openInNewTab =
    isExternalLink &&
    (chatSettings?.openExternalLinksInNewTab ||
      (!isExternalLink && chatSettings?.openInternalLinksInNewTab));
  const blankTarget = openInNewTab ? "_blank" : "_self";
  return href ? (
    <a {...props} href={href} target={blankTarget} rel="noopener noreferrer">
      {children}
    </a>
  ) : null;
};

const Message: React.FC<MessageProps> = React.memo(({ message, toolNames }) => {
  const [copied, setCopied] = useState(false);
  const { chatSettings, isEmbed } = useContext(ChatContext);
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    });
  };

  const isIframe = window.self !== window.top;

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
            const ToolComponent = toolComponents[part.toolInvocation.toolName];
            const isIframeOrEmbed = isIframe || isEmbed;
            const isDefaultTool =
              part.toolInvocation.toolName.endsWith("__default");
            const hideDefaultTool =
              (isDefaultTool && !chatSettings?.showDefaultToolsDebugMessages) ||
              isIframeOrEmbed;
            if (!ToolComponent || hideDefaultTool) return null;
            return (
              <div
                key={part.toolInvocation.toolCallId}
                className="oak-chat__message-tool-invocations"
              >
                {!isIframeOrEmbed &&
                  chatSettings?.showDefaultToolsDebugMessages && (
                    <span className="oak-chat__message-tool-invocations-marker">
                      using tool "{toolNames[part.toolInvocation.toolName]}"
                    </span>
                  )}
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
                <Markdown
                  components={{
                    a: (props) =>
                      renderMarkdownLink({ ...props, chatSettings }),
                  }}
                >
                  {DOMPurify.sanitize(part.text)}
                </Markdown>
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
});

export default Message;
