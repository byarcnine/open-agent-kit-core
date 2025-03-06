import "./chat.scss";
import { useChat, type Message } from "@ai-sdk/react";
import type { TextUIPart } from "@ai-sdk/ui-utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "../ui/textarea";
import { Send } from "react-feather";
import AdviceCards from "./adviceCards";
import Messages from "./messages";
import { MessageRole, type ChatSettings } from "~/types/chat";

const Chat = ({
  onConversationStart,
  initialMessages,
  initialConversationId,
  disableInput = false,
  apiUrl,
  meta,
  agentId,
  isEmbed = false,
  agentChatSettings = null,
  toolNamesList = {},
}: {
  onConversationStart?: (conversationId: string) => void;
  initialMessages?: Message[];
  initialConversationId?: string;
  disableInput?: boolean;
  agentId: string;
  apiUrl?: string;
  meta?: object;
  isEmbed?: boolean;
  agentChatSettings?: ChatSettings | null;
  toolNamesList?: Record<string, string>;
}) => {
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );

  const initialChatSettings = agentChatSettings || {
    initialMessage: "",
    suggestedQuestions: [],
    textAreaInitialRows: 2,
  };

  const [chatSettings, setChatSettings] =
    useState<ChatSettings>(initialChatSettings);
  const [toolNames, setToolNames] =
    useState<Record<string, string>>(toolNamesList);
  const [chatSettingsLoaded, setChatSettingsLoaded] = useState(!isEmbed);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const API_URL = (isEmbed ? apiUrl : window.location.origin)?.replace(
    /\/$/,
    ""
  );

  useEffect(() => {
    if (isEmbed) {
      const startTime = Date.now(); // Record the start time

      fetch(`${API_URL}/api/agentChatSettings/${agentId}`)
        .then((res) => res.json())
        .then((data) => {
          const chatSettings = data.chatSettings
            ? JSON.parse(data.chatSettings)
            : null;
          setChatSettings(chatSettings);
          setToolNames(data.toolNames);

          const elapsedTime = Date.now() - startTime; // Calculate elapsed time
          const remainingTime = Math.max(1500 - elapsedTime, 0); // Calculate remaining time to reach 2 seconds

          setTimeout(() => {
            setChatSettingsLoaded(true);
          }, remainingTime);
        })
        .catch((error) => {
          throw new Error(
            `Failed to fetch chat settings from ${API_URL}. Please ensure the API is running and the agentId is correct.`
          );
        });
    }
  }, []);

  const { messages, input, handleInputChange, handleSubmit, setInput } =
    useChat({
      api: `${API_URL}/api/generate`,
      body: {
        conversationId,
        agentId,
        meta,
      },
      initialMessages,
      onResponse: (response) => {
        const newConversationId = response.headers.get("x-conversation-id");
        if (newConversationId && !conversationId) {
          setConversationId(newConversationId);
          onConversationStart?.(newConversationId);
        }
      },
    });
  const handleKeyDown = useCallback(
    (event: KeyboardEvent | React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleCardSelect = (question: string) => {
    setInput(question);
  };

  useEffect(() => {
    const isSuggestedQuestion =
      chatSettings?.suggestedQuestions?.includes(input);
    if (isSuggestedQuestion) {
      handleSubmit();
    }
  }, [input, handleSubmit]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, []);

  // Add effect to adjust height when input changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  if (!chatSettingsLoaded && isEmbed) {
    return (
      <div id="oak-chat-container" className="oak-chat">
        <div className="oak-chat__loading-container">
          <img
            className="oak-chat__loading-logo"
            src={`${API_URL}/assets/logo.svg`}
            alt="OAK Logo"
          />
          <p className="oak-chat__loading-text">One moment, I'm on it..</p>
        </div>
      </div>
    );
  }

  const suggestedQuestions = chatSettings?.suggestedQuestions ?? [];
  const messagesWithInitMessage =
    chatSettings?.initialMessage &&
    (!initialMessages || initialMessages?.length === 0)
      ? [
          {
            id: "initial-message",
            role: MessageRole.Assistant,
            content: chatSettings.initialMessage,
            parts: [
              {
                type: "text",
                text: chatSettings.initialMessage,
              } as TextUIPart,
            ],
          },
          ...messages,
        ]
      : messages;

  return (
    <div id="oak-chat-container" className="oak-chat">
      {messagesWithInitMessage.length === 0 ? (
        <div className="oak-chat__empty-state">
          {chatSettings?.intro?.title && (
            <h1 className="oak-chat__empty-state-heading">
              {chatSettings?.intro?.title}
            </h1>
          )}
          {chatSettings?.intro?.subTitle && (
            <p className="oak-chat__empty-state-subheading">
              {chatSettings?.intro?.subTitle}
            </p>
          )}
          {suggestedQuestions.length > 0 && (
            <AdviceCards
              onCardSelect={handleCardSelect}
              questions={suggestedQuestions}
            />
          )}
        </div>
      ) : (
        <Messages toolNames={toolNames} messages={messagesWithInitMessage} />
      )}
      {!disableInput && (
        <>
          <div className="oak-chat__input-container">
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="oak-chat__form"
            >
              <Textarea
                ref={textareaRef}
                onKeyDown={handleKeyDown}
                name="prompt"
                value={input}
                rows={chatSettings?.textAreaInitialRows || 2}
                onChange={handleInputChange}
                placeholder="Type your message..."
                className="oak-chat__text-area"
              />
              <button
                type="submit"
                disabled={!input}
                className="oak-chat__submit-button"
              >
                <Send size={20} />
              </button>
            </form>
            {chatSettings?.footerNote && (
              <p className="oak-chat__footer-note">
                {chatSettings?.footerNote}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;
