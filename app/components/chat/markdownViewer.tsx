import Markdown from "react-markdown";
import DOMPurify from "dompurify";
import { CopyBlock } from "react-code-blocks";

const MarkdownViewer = ({ text }: { text: string }) => {
  return (
    <Markdown
      components={{
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
