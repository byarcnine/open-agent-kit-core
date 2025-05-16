import React, { useState, useEffect } from "react";
import Chat from "../app/components/chat/chat.client";
import { type ChatComponentType } from "../chat_module";
import "./chatWidget.scss";
import { createRoot } from "react-dom/client";
import type { ChatSettings } from "~/types/chat";
import ChatIcon from "./chatIcon";
import ArrowDownIcon from "./arrowDown";
const FloatingChatWidget = (props: ChatComponentType) => {
  const [open, setOpen] = useState(false);
  const initialMessageShown = sessionStorage.getItem("initialMessageShown");
  const [chatInitialized, setChatInitialized] = useState(false);
  const [title, setTitle] = useState<string>("");
  const [initialMessage, setInitialMessage] = useState<string>("");
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!initialMessageShown && initialMessage) {
      const timer = setTimeout(() => setShowPopup(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [initialMessageShown, initialMessage]);

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

  const onEmbedInit = (chatSettings: ChatSettings) => {
    setChatInitialized(true);
    if (!initialMessageShown) {
      setInitialMessage(chatSettings.initialMessage || "");
    }
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="oak-chat-widget-popup-title"
        >
          <div className="oak-chat-widget__popup-inner">
            <span
              id="oak-chat-widget-popup-title"
              className="oak-chat-widget__visually-hidden"
            >
              Chat Notification
            </span>
            <button
              className="oak-chat-widget__popup-close"
              aria-label="Close initial message"
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
              aria-label="Open chat and read initial message"
            >
              {initialMessage}
            </button>
          </div>
        </div>
      )}

      <div className="oak-chat-widget__bubble-container">
        <button
          onClick={() => setOpen(() => !open)}
          className={
            "oak-chat-widget__bubble-btn" +
            (chatInitialized ? " oak-chat-widget__bubble--fade-in" : "")
          }
          aria-label={open ? "Close chat" : "Open chat"}
        >
          {open ? <ArrowDownIcon /> : <ChatIcon />}
        </button>
        <div
          className={`oak-chat-widget__window${open ? "" : " oak-chat-widget__window--closed"}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="oak-chat-widget-title"
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
            <Chat
              {...props}
              isEmbed
              anchorToBottom={true}
              onEmbedInit={onEmbedInit}
            />
          </div>
          <div className="oak-chat-widget__window-footer">
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
