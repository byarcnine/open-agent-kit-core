import React, { useRef, useState, useEffect } from "react";
import CodeEditor from "react-simple-code-editor";
import Prism from "prismjs";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import "prismjs/themes/prism.css";

interface CustomCodeEditorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  highlight: "CSS" | "JS" | "HTML";
}

const HighlightLanguage = {
  CSS: (value: string) => Prism.highlight(value, Prism.languages.css, "css"),
  JS: (value: string) => Prism.highlight(value, Prism.languages.js, "js"),
  HTML: (value: string) => Prism.highlight(value, Prism.languages.html, "html"),
};

const CustomCodeEditor: React.FC<CustomCodeEditorProps> = ({
  value,
  onValueChange,
  placeholder = "Enter custom code",
  highlight,
}) => {
  const parentDivRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      setTimeout(() => {
        if (parentDivRef.current) {
          parentDivRef.current.scrollTop = parentDivRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    import("prismjs").then(() => setIsReady(true));
  }, []);

  return (
    <div
      ref={parentDivRef}
      style={{ minHeight: "100px", maxHeight: "500px", overflowY: "auto" }}
      className="border rounded-md"
    >
      <ClientOnlyComponent>
        <CodeEditor
          value={value}
          onValueChange={onValueChange}
          highlight={HighlightLanguage[highlight]}
          padding={10}
          className="font-regular text-primary text-sm"
          placeholder={placeholder}
          textareaClassName="focus:outline-none"
          // @ts-ignore
          onKeyDown={handleKeyDown}
        />
      </ClientOnlyComponent>
    </div>
  );
};

export default CustomCodeEditor;
