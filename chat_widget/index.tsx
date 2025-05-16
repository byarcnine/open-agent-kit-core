import React, { useState, useEffect } from "react";
import Chat from "../app/components/chat/chat.client";
import { type ChatComponentType } from "../chat_module";
import "./chatWidget.scss";
import { createRoot } from "react-dom/client";

const popupMessage = "What can you do?";

const ArrowDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="2.3"
    stroke="currentColor"
    width="32"
    height="32"
    className="oak-chat-widget__icon"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
    ></path>
  </svg>
);

const MessageIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    className="oak-chat-widget__icon"
  >
    <defs>
      <mask id="cutout-mask">
        <rect width="40" height="40" fill="currentColor" />
        <g transform="translate(13.7,2) scale(0.5)">
          <path
            d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"
            fill="black"
          />
        </g>
        <g transform="translate(13,8) scale(0.2)">
          <path
            d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z"
            fill="black"
          />
        </g>
      </mask>
    </defs>
    <path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      fill="currentColor"
      mask="url(#cutout-mask)"
    />
  </svg>
);

const FloatingChatWidget = (props: ChatComponentType) => {
  const [open, setOpen] = useState(false);
  const initialMessageShown = sessionStorage.getItem("initialMessageShown");
  const [title, setTitle] = useState<string>("Test Title");
  const [initialMessage, setInitialMessage] = useState<string>(
    initialMessageShown ? "" : popupMessage,
  );
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!initialMessageShown) {
      const timer = setTimeout(() => setShowPopup(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [initialMessageShown]);

  useEffect(() => {
    if (open && showPopup) {
      closeInitialMessage();
    }
  }, [open, showPopup]);

  const closeInitialMessage = () => {
    setInitialMessage("");
    sessionStorage.setItem("initialMessageShown", "true");
    setShowPopup(false);
  };

  return (
    <div id="oak-chat-widget-root">
      {!open && initialMessage && (
        <div
          className={
            "oak-chat-widget__popup" +
            (showPopup
              ? " oak-chat-widget__popup--fade-in"
              : " oak-chat-widget__popup--closed")
          }
        >
          <div className="oak-chat-widget__popup-inner">
            <button
              className="oak-chat-widget__popup-close"
              aria-label="Close Initial Message"
              onClick={closeInitialMessage}
              type="button"
            >
              ×
            </button>
            <button
              className="oak-chat-widget__popup-button"
              onClick={() => {
                setOpen(true);
              }}
            >
              {initialMessage}
            </button>
          </div>
        </div>
      )}

      <div className="oak-chat-widget__bubble-container">
        <button
          onClick={() => setOpen((o) => !o)}
          className="oak-chat-widget__bubble-btn"
          aria-label={open ? "Close chat" : "Open chat"}
        >
          {open ? <ArrowDownIcon /> : <MessageIcon />}
        </button>
        <div
          className={`oak-chat-widget__window${open ? "" : " oak-chat-widget__window--closed"}`}
        >
          <div className="oak-chat-widget__window-header">
            <span className="oak-chat-widget__window-title">{title}</span>
            <button
              onClick={() => setOpen(false)}
              className="oak-chat-widget__close-btn"
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
          <div className="oak-chat-widget__window-content">
            <Chat {...props} isEmbed anchorToBottom={true} />
          </div>
          <div className="oak-chat-widget__footer">
            Powered by{" "}
            <a
              href="https://open-agent-kit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="oak-chat-widget__footer-link"
            >
              OAK
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export const renderChatWidget = (divId: string, config: ChatComponentType) => {
  let container = document.getElementById(divId);
  if (!container) {
    container = document.createElement("div");
    container.id = divId;
    document.body.appendChild(container);
  }
  const root = createRoot(container);
  root.render(<FloatingChatWidget {...config} />);
};
