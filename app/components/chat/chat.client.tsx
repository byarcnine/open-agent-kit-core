import "./chat.scss";
import React from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "../ui/textarea";
import {
  ArrowUp,
  Compass,
  FileText,
  Globe,
  Plus,
  XCircle,
} from "react-feather";
import AdviceCards from "./adviceCards";
import Messages from "./messages";
import { MessageRole, type ChatSettings } from "~/types/chat";
import { initialChatSettings } from "~/constants/chat";

interface ChatContextType {
  isEmbed: boolean;
  chatSettings: ChatSettings;
}

export const ChatContext = React.createContext<ChatContextType>({
  isEmbed: false,
  chatSettings: initialChatSettings,
});
interface TextPart {
  type: "text";
  text: string;
}

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
  avatarImageURL,
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
  avatarImageURL?: string;
}) => {
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId,
  );

  const [chatSettings, setChatSettings] = useState<ChatSettings>(
    agentChatSettings || initialChatSettings,
  );
  const [toolNames, setToolNames] =
    useState<Record<string, string>>(toolNamesList);
  const [chatSettingsLoaded, setChatSettingsLoaded] = useState(!isEmbed);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileList | undefined>(undefined);

  const [type, setType] = useState("text");
  const [selectedAction, setSelectedAction] = useState<
    "default" | "deep-research" | "search-web"
  >("default");

  const supportedFileTypes = chatSettings?.supportedFileTypes || [];

  const API_URL = (isEmbed ? apiUrl : window.location.origin)?.replace(
    /\/$/,
    "",
  );

  useEffect(() => {
    if (isEmbed) {
      const startTime = Date.now();
      fetch(`${API_URL}/api/agentChatSettings/${agentId}`)
        .then((res) => res.json())
        .then((data) => {
          setChatSettings(data.chatSettings || chatSettings);
          setToolNames(data.toolNames);

          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(1500 - elapsedTime, 0);

          setTimeout(() => {
            setChatSettingsLoaded(true);
          }, remainingTime);
        })
        .catch((error) => {
          console.error("Error fetching chat settings:", error);
          throw new Error(
            `Failed to fetch chat settings from ${API_URL}. Please ensure the API is running and the agentId is correct.`,
          );
        });
    }
  }, []);

  const initMessages =
    chatSettings?.initialMessage && !initialMessages?.length
      ? [
          {
            id: "initial-message",
            role: MessageRole.Assistant,
            content: chatSettings?.initialMessage,
            parts: [
              {
                type: "text",
                text: chatSettings?.initialMessage,
              } as TextPart,
            ],
          } as Message,
        ]
      : initialMessages;

  const { messages, input, handleInputChange, handleSubmit, setInput, error } =
    useChat({
      api: `${API_URL}/api/generate`,
      body: {
        conversationId,
        agentId,
        meta,
      },
      initialMessages: initMessages,
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
        handleSubmit(event, {
          experimental_attachments: files,
        });
        setFiles(undefined);
      }
    },
    [handleSubmit],
  );

  const handleCardSelect = (question: string) => {
    setInput(question);
  };

  const clearSelectedFile = (fileName: string) => {
    setFiles((prevFiles) => {
      if (!prevFiles) return prevFiles;
      const updatedFiles = Array.from(prevFiles).filter(
        (file) => file.name !== fileName,
      );
      const dataTransfer = new DataTransfer();
      updatedFiles.forEach((file) => dataTransfer.items.add(file));
      return dataTransfer.files;
    });
  };

  useEffect(() => {
    const isSuggestedQuestion =
      chatSettings?.suggestedQuestions?.includes(input);
    if (isSuggestedQuestion) {
      handleSubmit(event, {
        experimental_attachments: files,
      });
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

  const handleSelectedAction = (
    action: "default" | "deep-research" | "search-web",
  ) => {
    if (selectedAction === action) {
      setSelectedAction("default");
      return;
    } else {
      setSelectedAction(action);
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  if (!chatSettingsLoaded && isEmbed) {
    return (
      <div id="oak-chat-container" className="oak-chat">
        <div className="oak-chat__loading-container">
          <img
            className="oak-chat__loading-logo"
            src={avatarImageURL || `${API_URL}/assets/oak_leaf.svg`}
            alt="Logo"
          />
          <p className="oak-chat__loading-text">One moment, I'm on it..</p>
        </div>
      </div>
    );
  }

  const suggestedQuestions = chatSettings?.suggestedQuestions ?? [];
  return (
    <ChatContext.Provider value={{ isEmbed, chatSettings }}>
      <div id="oak-chat-container" className="oak-chat">
        {messages.length === 0 ? (
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
          <>
            <Messages
              toolNames={toolNames}
              messages={messages}
              error={error?.message}
              avatarURL={avatarImageURL || `${API_URL}/assets/oak_leaf.svg`}
            >
              {status === "submitted" && (
                <p className="oak-chat__thinking-message">
                  Thinking
                  <span className="oak-chat__thinking-dots" />
                </p>
              )}
            </Messages>
          </>
        )}
        {!disableInput && (
          <>
            <div className="oak-chat__input-container">
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="oak-chat__form"
              >
                {files && (
                  <div className="oak-chat__file-thumbnails">
                    {Array.from(files).map((file) => (
                      <div
                        key={file.name}
                        className="oak-chat__file-thumbnails__item"
                      >
                        {file.type.startsWith("image/") && (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                          />
                        )}
                        {file.type === "application/pdf" && (
                          <div className="oak-chat__file-thumbnails__item--pdf">
                            <div className="oak-chat__file-thumbnails__item--pdf-icon">
                              <FileText size={20} />
                            </div>
                            <div>
                              <span>{file.name}</span>
                              <span>PDF</span>
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          className="oak-chat__file-remove-button"
                          onClick={() => clearSelectedFile(file.name)}
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

                <div className="oak-chat__action-row gap-2">
                  {chatSettings?.enableFileUpload && supportedFileTypes && (
                    <div>
                      <button
                        type="button"
                        className="oak-chat__action-button"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Plus size={18} />
                      </button>
                      <input
                        multiple
                        type="file"
                        accept={supportedFileTypes.join(",")}
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={(event) => {
                          if (event.target.files) {
                            setFiles(event.target.files);
                          }
                        }}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    className={`oak-chat__action-button ${
                      selectedAction === "deep-research" ? "active" : ""
                    }`}
                    onClick={() => handleSelectedAction("deep-research")}
                  >
                    <Compass size={18} />
                    <span>Deep Research</span>
                  </button>
                  <button
                    type="button"
                    className={`oak-chat__action-button ${
                      selectedAction === "search-web" ? "active" : ""
                    }`}
                    onClick={() => handleSelectedAction("search-web")}
                  >
                    <Globe size={18} />
                    <span>Search Web</span>
                  </button>
                  <button
                    type="submit"
                    disabled={!input}
                    className="oak-chat__submit-button"
                  >
                    <ArrowUp size={20} />
                  </button>
                </div>
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
    </ChatContext.Provider>
  );
};

export default Chat;
