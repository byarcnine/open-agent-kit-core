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

const OAK_SESSION_TOKEN_KEY = "oak_session_token";

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
  const [files, setFiles] = useState<File[]>([]);

  const [selectedAction, setSelectedAction] = useState<
    "default" | "deep-research" | "search-web"
  >("default");

  const supportedFileTypes = chatSettings?.supportedFileTypes || [];

  const API_URL = (isEmbed ? apiUrl : window.location.origin)?.replace(
    /\/$/,
    "",
  );

  // inject custom css
  useEffect(() => {
    const style = document.createElement("style");
    const customCSS = chatSettings?.customCSS;
    if (customCSS) {
      style.innerHTML = customCSS;
    }
    document.head.appendChild(style);
  }, [chatSettings?.customCSS]);

  useEffect(() => {
    if (isEmbed) {
      const startTime = Date.now();
      const oakSessionToken = sessionStorage.getItem(OAK_SESSION_TOKEN_KEY);
      const headers: HeadersInit = {};
      if (oakSessionToken) {
        headers["x-oak-session-token"] = oakSessionToken;
      }

      fetch(`${API_URL}/api/agentChatSettings/${agentId}`, {
        headers,
      })
        .then((res) => res.json())
        .then((data) => {
          setChatSettings(data.chatSettings || chatSettings);
          setToolNames(data.toolNames);

          if (!data.sessionValid) {
            setConversationId(undefined);
            sessionStorage.removeItem(OAK_SESSION_TOKEN_KEY);
          }

          if (data.messages) {
            setMessages(data.messages);
          }
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
      : initialMessages || [];

  const createFileList = (filesArray: File[]): FileList => {
    const dataTransfer = new DataTransfer();
    filesArray.forEach((file) => dataTransfer.items.add(file));
    return dataTransfer.files;
  };

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setInput,
    status,
    error,
    setMessages,
  } = useChat({
    api: `${API_URL}/api/generate`,
    body: {
      conversationId,
      agentId,
      meta,
    },
    initialMessages: initMessages,
    onResponse: (response) => {
      const newConversationId = response.headers.get("x-conversation-id");
      const oakSessionToken = response.headers.get("x-oak-session-token");
      if (newConversationId && !conversationId) {
        setConversationId(newConversationId);
        onConversationStart?.(newConversationId);
      }
      if (oakSessionToken) {
        sessionStorage.setItem(OAK_SESSION_TOKEN_KEY, oakSessionToken);
      }
    },
  });

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFiles([]);
  };

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (input.trim() === "") {
        return;
      }
      handleSubmit(event, {
        experimental_attachments: files.length
          ? createFileList(files)
          : undefined,
      });
      textareaRef.current?.blur();
      clearFileInput();
    },
    [handleSubmit, input, files],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent | React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSubmit(event, {
          experimental_attachments: files.length
            ? createFileList(files)
            : undefined,
        });
        textareaRef.current?.blur();
        clearFileInput();
      }
    },
    [handleSubmit, files],
  );

  const handleCardSelect = (question: string) => {
    setInput(question);
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    event.preventDefault();
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      setFiles((prevFiles) => {
        const merged = [...prevFiles];
        newFiles.forEach((file) => {
          const exists = merged.some(
            (f) => f.name === file.name && f.size === file.size,
          );
          if (!exists) {
            merged.push(file);
          }
        });
        return merged;
      });
    }
  };

  const clearSelectedFile = (fileName: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.name !== fileName));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!chatSettings?.enableFileUpload) {
      return;
    }

    const droppedFiles = Array.from(event.dataTransfer.files);
    setFiles((prevFiles) => {
      const merged = [...prevFiles];
      droppedFiles.forEach((file) => {
        const exists = merged.some(
          (f) => f.name === file.name && f.size === file.size,
        );
        if (!exists) {
          merged.push(file);
        }
      });
      return merged;
    });
  };

  useEffect(() => {
    const isSuggestedQuestion =
      chatSettings?.suggestedQuestions?.includes(input);
    if (isSuggestedQuestion) {
      handleSubmit(event, {
        experimental_attachments: files.length
          ? createFileList(files)
          : undefined,
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

  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

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
      <div
        id="oak-chat-container"
        className={`oak-chat`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
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
                onSubmit={handleFormSubmit}
                className="oak-chat__form"
              >
                {files.length > 0 && (
                  <div className="oak-chat__file-thumbnails">
                    {files.map((file) => (
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
                <div className="oak-chat__text-area-container">
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
                </div>

                <div className="oak-chat__action-row">
                  {chatSettings?.enableFileUpload && supportedFileTypes && (
                    <div>
                      <button
                        type="button"
                        className="oak-chat__action-button"
                        onClick={handleFileButtonClick}
                      >
                        <Plus size={18} />
                      </button>
                      <input
                        multiple
                        type="file"
                        accept={supportedFileTypes.join(",")}
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileInputChange}
                      />
                    </div>
                  )}
                  {/*
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
                  */}
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
