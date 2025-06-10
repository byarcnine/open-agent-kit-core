import { createRoot } from "react-dom/client";
import React, { createRef } from "react";
import Chat, { type ChatRef } from "../app/components/chat/chat.client";
import { type ChatComponentType } from "../chat_module";

// Return type for the render function
interface ChatEmbedAPI {
  setInput: (input: string) => void;
}

// Function to render the component
export function renderChatComponent(
  divId: string,
  config: ChatComponentType
): ChatEmbedAPI | null {
  const container = document.getElementById(divId);
  if (!container) {
    console.error(`No element found with ID: ${divId}`);
    return null;
  }

  const chatRef = createRef<ChatRef>();
  const root = createRoot(container);

  root.render(<Chat ref={chatRef} {...config} isEmbed />);

  const api: ChatEmbedAPI = {
    setInput: (input: string) => {
      if (chatRef.current) {
        chatRef.current.setInput(input);
      }
    }
  };

  return api;
}
