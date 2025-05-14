import Markdown from "react-markdown";
import DOMPurify from "dompurify";
import { CopyBlock, atomOneLight } from "react-code-blocks";
import type { ChatSettings } from "~/types/chat";
import type { AnchorHTMLAttributes, HTMLAttributes } from "react";
import type { DetailedHTMLProps } from "react";
import { useContext } from "react";
import { ChatContext } from "./chat.client";
import React from "react";
import { decode } from "html-entities";
import remarkGfm from "remark-gfm";

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

function enhanceChildrenWithMedia(
  children: React.ReactNode,
  chatSettings: ChatSettings | undefined,
) {
  const isYouTubeUrl = (url: string) =>
    url.includes("youtube.com") || url.includes("youtu.be");

  const isImageUrl = (url: string) =>
    /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i.test(url);

  const childArray = React.Children.toArray(children);

  const enhancedChildren = childArray.flatMap((child, index) => {
    if (typeof child === "string") {
      const trimmed = child.trim();
      if (isYouTubeUrl(trimmed) && chatSettings?.openYoutubeVideosInIframe) {
        return <YouTubeEmbed key={index} url={trimmed} />;
      } else if (isImageUrl(trimmed)) {
        return (
          <img
            key={index}
            src={trimmed}
            alt=""
            loading="lazy"
            className="max-w-full h-auto"
          />
        );
      }
    } else if (React.isValidElement(child)) {
      const element = child as React.ReactElement<any>;
      if (
        typeof element.props.href === "string" &&
        isYouTubeUrl(element.props.href) &&
        chatSettings?.openYoutubeVideosInIframe
      ) {
        return <YouTubeEmbed key={index} url={element.props.href} />;
      }
      return child;
    }
    return child;
  });

  const hasBlock = enhancedChildren.some(
    (child) =>
      React.isValidElement(child) &&
      ["div", "iframe", "img"].includes(
        typeof child.type === "string" ? child.type : "",
      ),
  );

  return { enhancedChildren, hasBlock };
}

const CustomP = (props: HTMLAttributes<HTMLParagraphElement>) => {
  const { chatSettings } = useContext(ChatContext);
  const { enhancedChildren, hasBlock } = enhanceChildrenWithMedia(
    props.children,
    chatSettings,
  );

  if (hasBlock) {
    return <>{enhancedChildren}</>;
  }

  return <p {...props}>{enhancedChildren}</p>;
};

const CustomLI = (props: HTMLAttributes<HTMLLIElement>) => {
  const { chatSettings } = useContext(ChatContext);
  const { enhancedChildren, hasBlock } = enhanceChildrenWithMedia(
    props.children,
    chatSettings,
  );

  if (hasBlock) {
    return <>{enhancedChildren}</>;
  }

  return <li {...props}>{enhancedChildren}</li>;
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
      remarkPlugins={[remarkGfm]}
      components={{
        p: CustomP,
        li: CustomLI,
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
              text={decode(String(children).replace(/\n$/, ""))}
              language={match[1]}
              showLineNumbers={false}
              theme={atomOneLight}
              customStyle={{
                display: "flex",
                padding: "10px",
              }}
            />
          ) : (
            <code
              className={`${className} whitespace-pre-wrap break-words`}
              {...props}
            >
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
