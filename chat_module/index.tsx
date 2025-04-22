import { useEffect } from "react";

export type ChatComponentType = {
  apiUrl?: string;
  meta?: object;
  agentId: string;
  avatarImageURL?: string;
};

const containerId = "oak-chat-container";

/**
 * ChatModule is a standalone chat component that can be used in any React project.
 *
 * @param apiUrl - The URL of the API to use for the chat.
 * @param agentId - The ID of the agent to use for the chat.
 * @param meta - The meta object to pass to the chat. The meta object can be accessed by the tools.
 */
function ChatModule({
  apiUrl,
  agentId,
  meta,
  avatarImageURL,
}: ChatComponentType) {
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

        // @ts-ignore
        ChatComponent.renderChatComponent(containerId, {
          agentId,
          apiUrl,
          meta,
          avatarImageURL,
        });
      } catch (e: any) {
        showError(`Error: An unexpected error occurred. ${e.message}`);
      }
    });

    return () => {
      document.body.removeChild(script);
    };
  }, [apiUrl, agentId, meta]);

  return <div id={containerId} />;
}

export default ChatModule;
