import React, { useState } from "react";
import Chat from "../app/components/chat/chat.client";
import { type ChatComponentType } from "../chat_module";
import "./chatWidget.scss";

// Add your suggested questions here
const suggestedQuestions = [
  "What can you do?",
  "How do I reset my password?",
  "Tell me about your features",
];

// Floating chat widget component
const FloatingChatWidget = (props: ChatComponentType) => {
  const [open, setOpen] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  return (
    <div id="oakChatWidget">
      {/* Suggested questions, only visible when chat is closed */}
      {!open && (
        <div className="oakChatWidget__suggested">
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              className="oakChatWidget__suggested-button"
              onClick={() => {
                setOpen(true);
                // Optionally, you can pass the question to the chat input here
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Chat bubble */}
      <div className="oakChatWidget__bubble-container">
        {/* Bubble button */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="oakChatWidget__bubble-btn"
          style={{ display: open ? "none" : "flex" }}
          aria-label="Open chat"
        >
          💬
        </button>

        {/* Chat window, animated */}
        <div
          className={`oakChatWidget__window${open ? "" : " oakChatWidget__window--closed"}`}
        >
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="oakChatWidget__close-btn"
            aria-label="Close chat"
          >
            ×
          </button>
          {/* Chat component */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <Chat {...props} isEmbed />
          </div>
        </div>
      </div>
    </div>
  );
};

export const renderChatWidget = (props: ChatComponentType) => {
  return <FloatingChatWidget {...props} />;
};
