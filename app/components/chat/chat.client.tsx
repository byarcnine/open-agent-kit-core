import "./chat.scss";
import React, { useMemo } from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { useState, useEffect, useRef, useCallback } from "react";
import AdviceCards from "./adviceCards";
import Messages from "./messages";
import { MessageRole, type ChatSettings } from "~/types/chat";
import { initialChatSettings } from "~/constants/chat";
import { solveChallenge } from "altcha-lib";
import ChatInput from "./chatInput";

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

const OAK_CONVERSATION_TOKEN_KEY = "oak_conversation_token";

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

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionTokenIsRefreshing, setSessionTokenIsRefreshing] = useState(false);

  const [toolNames, setToolNames] =
    useState<Record<string, string>>(toolNamesList);
  const [chatInitialized, setChatInitialized] = useState(!isEmbed);

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

  const generateChatToken = async () => {
    try {
      const challengeRes = await fetch(`${API_URL}/api/generate/token`);
      const challenge = await challengeRes.json();
      const { promise } = solveChallenge(challenge.challenge, challenge.salt, challenge.algorithm, challenge.maxnumber);
      const solution = await promise;

      const altchaSolution = {
        ...challenge,
        number: solution?.number,
      }

      const res = await fetch(`${API_URL}/api/generate/token`, {
        method: "POST",
        body: JSON.stringify({ agentId, altchaSolution }),
      });

      const data = await res.json();
      if (data.jwt) {
        setSessionToken(data.jwt);
        return data.jwt;
      } else {
        setSessionToken(null);
        console.error("Failed to get chat session token. No JWT in response.");
        return null;
      }
    } catch (error) {
      console.error("Failed to get chat session token:", error);
      setSessionToken(null);
      return null;
    }
  };

  const getChatSettings = async () => {
    const headers: HeadersInit = {};
    const oakConversationToken = sessionStorage.getItem(OAK_CONVERSATION_TOKEN_KEY);
    if (oakConversationToken) {
      headers["x-oak-conversation-token"] = oakConversationToken;
    }

    try {
      const res = await fetch(`${API_URL}/api/agentChatSettings/${agentId}`, {
        headers,
      });
      const data = await res.json();
      setChatSettings(data.chatSettings || chatSettings);
      setToolNames(data.toolNames);

      if (!data.conversationValid) {
        setConversationId(undefined);
        sessionStorage.removeItem(OAK_CONVERSATION_TOKEN_KEY);
      }

      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Error fetching chat settings:", error);
      throw new Error(
        `Failed to fetch chat settings from ${API_URL}. Please ensure the API is running and the agentId is correct.`,
      );
    }
  };

  useEffect(() => {
    if (isEmbed) {
      const initChat = async () => {
        const startTime = Date.now();
        await Promise.all([getChatSettings(), generateChatToken()]);
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(1500 - elapsedTime, 0);

        setTimeout(() => {
          setChatInitialized(true);
        }, remainingTime);
      };
      initChat();
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

  const validateSessionToken = async () => {
    let token = sessionToken || "";
    if (isJwtExpired(token)) {
      setSessionTokenIsRefreshing(true);
      token = await generateChatToken();
      setSessionToken(token);
      setSessionTokenIsRefreshing(false);
    }
    return token;
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
    headers: {
      "x-oak-session-token": sessionToken || "",
    },
    body: {
      conversationId,
      agentId,
      meta,
    },
    initialMessages: initMessages,
    onResponse: (response) => {
      const newConversationId = response.headers.get("x-conversation-id");
      const oakConversationToken = response.headers.get(
        "x-oak-conversation-token",
      );
      if (newConversationId && !conversationId) {
        setConversationId(newConversationId);
        onConversationStart?.(newConversationId);
      }
      if (oakConversationToken) {
        sessionStorage.setItem(
          OAK_CONVERSATION_TOKEN_KEY,
          oakConversationToken,
        );
      }
    },
  });

  const handleSubmitWithTokenCheck = async (
    event: React.FormEvent<HTMLFormElement> | KeyboardEvent | React.KeyboardEvent<HTMLTextAreaElement> | undefined,
    options?: any
  ) => {
    if (event) {
      event.preventDefault();
    }
    if (input.trim() === "") {
      return;
    }
    textareaRef.current?.blur();
    clearFileInput();
    const token = await validateSessionToken();
    // ensure state is updated before submitting
    handleSubmit(event, {
      ...options,
      headers: {
        ...options?.headers,
        "x-oak-session-token": token,
      },
    });
  };

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFiles([]);
  };

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      handleSubmitWithTokenCheck(event, {
        experimental_attachments: files.length
          ? createFileList(files)
          : undefined,
      });
    },
    [handleSubmitWithTokenCheck, input, files],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent | React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        handleSubmitWithTokenCheck(event, {
          experimental_attachments: files.length
            ? createFileList(files)
            : undefined,
        });
      }
    },
    [handleSubmitWithTokenCheck, files],
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
      handleSubmitWithTokenCheck(undefined, {
        experimental_attachments: files.length
          ? createFileList(files)
          : undefined,
      });
    }
  }, [input, handleSubmitWithTokenCheck]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const contextValue = useMemo(
    () => ({ isEmbed, chatSettings }),
    [isEmbed, chatSettings],
  );

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

  if (!chatInitialized && isEmbed) {
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
    <ChatContext.Provider value={contextValue}>
      <div
        key={conversationId}
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
            <ChatInput
              files={files}
              input={!sessionTokenIsRefreshing ? input : ""}
              handleInputChange={handleInputChange}
              handleKeyDown={handleKeyDown}
              handleFormSubmit={handleFormSubmit}
              textareaRef={textareaRef as React.RefObject<HTMLTextAreaElement>}
              fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
              supportedFileTypes={supportedFileTypes}
              chatSettings={chatSettings}
              handleFileInputChange={handleFileInputChange}
              handleFileButtonClick={handleFileButtonClick}
              onClearFile={clearSelectedFile}
            />
            {chatSettings?.footerNote && (
              <p className="oak-chat__footer-note">
                {chatSettings?.footerNote}
              </p>
            )}
          </>
        )}
      </div>
    </ChatContext.Provider>
  );
};

export default Chat;

const isJwtExpired = (token: string) => {
  if (!token) return true;
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload));
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now + 30;
  } catch {
    return true;
    }
}