import React, { useRef, useState } from "react";
import CodeEditor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-css";
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
  placeholder = "Enter custom CSS",
  highlight,
}) => {
  const parentDivRef = useRef<HTMLDivElement>(null);
  const [customCSS, setCustomCSS] = useState("");

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      setTimeout(() => {
        if (parentDivRef.current) {
          parentDivRef.current.scrollTop = parentDivRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  return (
    <div
      ref={parentDivRef}
      style={{ minHeight: "100px", maxHeight: "500px", overflowY: "auto" }}
      className="border rounded-md"
    >
      <CodeEditor
        value={value}
        onValueChange={onValueChange}
        highlight={HighlightLanguage[highlight]}
        padding={10}
        className="font-regular text-primary text-sm"
        placeholder={placeholder}
        style={{
          border: "none",
          outline: "none",
          boxShadow: "none",
          outlineColor: "transparent",

        }}
        // @ts-ignore
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

export default CustomCodeEditor;