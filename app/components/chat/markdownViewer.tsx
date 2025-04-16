import Markdown from "react-markdown";
import DOMPurify from "dompurify";
import { CopyBlock } from "react-code-blocks";
import type { ChatSettings } from "~/types/chat";
import type { AnchorHTMLAttributes } from "react";
import type { DetailedHTMLProps } from "react";
import { useContext } from "react";
import { ChatContext } from "./chat.client";
import React from "react";

const getYoutubeVideoId = (url: string) => {
  const videoId = url.includes("youtube.com")
    ? new URL(url).searchParams.get("v")
    : url.split("/").pop();
  return videoId;
};

const YouTubeEmbed = React.memo(({ url }: { url: string }) => {
  const videoId = getYoutubeVideoId(url);
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
});

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

const MarkdownViewer = ({ text }: { text: string }) => {
  const { chatSettings } = useContext(ChatContext);
  return (
    <Markdown
      components={{
        a: (props) => renderMarkdownLink({ ...props, chatSettings }),
        code({
          node,
          inline,
          className,
          children,
          ...props
        }: {
          node?: any;
          inline?: boolean;
          className?: string;
          children?: React.ReactNode;
        } & React.HTMLAttributes<HTMLElement>) {
          const match = /language-(\w+)/.exec(className || "");
          return !inline && match ? (
            <CopyBlock
              text={String(children).replace(/\n$/, "")}
              language={match[1]}
              showLineNumbers={false}
              codeBlock
            />
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {DOMPurify.sanitize(text)}
    </Markdown>
  );
};

export default MarkdownViewer;
