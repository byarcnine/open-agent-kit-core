import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { MessageRole } from "~/types/chat";
import "../public/embed/core.css";
import { type Message } from "@ai-sdk/react";
import { type ChatRef } from "../app/components/chat/chat.client";

export type ChatComponentType = {
  apiUrl?: string;
  meta?: object;
  agentId: string;
  avatarImageURL?: string;
  initialMessage?: string;
  onMessage?: (messages: Message[]) => void;
};

const containerId = "oak-chat-container";

export interface ChatModuleRef {
  setInput: (input: string) => void;
}

/**
 * ChatModule is a standalone chat component that can be used in any React project.
 *
 * @param apiUrl - The URL of the API to use for the chat.
 * @param agentId - The ID of the agent to use for the chat.
 * @param meta - The meta object to pass to the chat. The meta object can be accessed by the tools.
 */
const ChatModule = forwardRef<ChatModuleRef, ChatComponentType>((
  {
    apiUrl,
    agentId,
    meta,
    avatarImageURL,
    initialMessage,
    onMessage,
  },
  ref
) => {
  const chatAPIRef = useRef<ChatRef>(null);

  useImperativeHandle(ref, () => ({
    setInput: (input: string) => {
      if (chatAPIRef.current) {
        chatAPIRef.current.setInput(input);
      }
    }
  }), []);

  useEffect(() => {
    const showError = (message: string) => {
      const container = document.getElementById(containerId);
      if (container) {
        const span = document.createElement("span");
        span.textContent = message;
        container.appendChild(span);
      }
    };

    if (!apiUrl) {
      showError("Error: API URL is not defined.");
      return;
    }

    const loadScript = (src: string, onLoad: () => void) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = onLoad;
      script.onerror = () => {
        showError("Error: Failed to load the chat script.");
      };
      document.body.appendChild(script);
      return script;
    };

    const script = loadScript(`${apiUrl}/embed/chat.bundle.umd.js`, () => {
      try {
        // @ts-ignore
        if (typeof ChatComponent === "undefined") {
          showError("Error: ChatComponent failed to load.");
          return;
        }

        const initialMessages = initialMessage ? [
          {
            id: "initial-message",
            role: MessageRole.Assistant,
            content: initialMessage,
            parts: [
              {
                type: "text",
                text: initialMessage,
              },
            ],
          },
        ] : [];

        // @ts-ignore
        chatAPIRef.current = ChatComponent.renderChatComponent(containerId, {
          agentId,
          apiUrl,
          meta,
          avatarImageURL,
          initialMessages,
          onMessage: onMessage,
        });
      } catch (e: any) {
        showError(`Error: An unexpected error occurred. ${e.message}`);
      }
    });

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      chatAPIRef.current = null;
    };
  }, [apiUrl, agentId, meta, initialMessage, onMessage]);

  return <div id={containerId} />;
});

export default ChatModule;
