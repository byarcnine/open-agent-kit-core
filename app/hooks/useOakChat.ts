import { useChat, type Message } from "@ai-sdk/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { MessageRole, type ChatSettings } from "~/types/chat";
import { initialChatSettings } from "~/constants/chat";
import { solveChallenge } from "altcha-lib";

type UseOakChatArgs = {
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
  anchorToBottom?: boolean;
  avatarImageURL?: string;
  onEmbedInit?: (chatSettings: ChatSettings) => void;
};

type UseOakChatReturn = {
  conversationId: string | undefined;
  chatSettings: ChatSettings;
  toolNames: Record<string, string>;
  chatInitialized: boolean;
  sessionToken: string | null;
  sessionTokenIsRefreshing: boolean;
  messages: Message[];
  input: string;
  status: "error" | "submitted" | "streaming" | "ready";
  error: Error | null;
  files: File[];
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (
    event: KeyboardEvent | React.KeyboardEvent<HTMLTextAreaElement>,
  ) => void;
  handleFormSubmit: (event: { preventDefault: () => void }) => Promise<void>;
  handleCardSelect: (question: string) => void;
  handleFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileButtonClick: () => void;
  clearSelectedFile: (fileName: string) => void;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  supportedFileTypes: string[];
  avatar: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setInput: (input: string) => void;
};

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
};

const useOakChat = ({
  onConversationStart,
  initialMessages,
  initialConversationId,
  agentId,
  apiUrl,
  meta,
  isEmbed = false,
  agentChatSettings = null,
  toolNamesList = {},
  avatarImageURL,
  onEmbedInit,
}: UseOakChatArgs): UseOakChatReturn => {
  const OAK_CONVERSATION_TOKEN_KEY = "oak_conversation_token";
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId,
  );
  const [chatSettings, setChatSettings] = useState<ChatSettings>(
    agentChatSettings || initialChatSettings,
  );
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionTokenIsRefreshing, setSessionTokenIsRefreshing] =
    useState(false);
  const [toolNames, setToolNames] =
    useState<Record<string, string>>(toolNamesList);
  const [chatInitialized, setChatInitialized] = useState(!isEmbed);
  const [initMessages, setInitMessages] = useState<Message[]>(
    initialMessages || [],
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);

  // const [selectedAction, setSelectedAction] = useState<"default" | "deep-research" | "search-web">("default");
  const supportedFileTypes = chatSettings?.supportedFileTypes || [];

  const API_URL = (isEmbed ? apiUrl : window.location.origin)?.replace(
    /\/$/,
    "",
  );

  const avatar = avatarImageURL || `${API_URL}/assets/oak_leaf.svg`;

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
      const { promise } = solveChallenge(
        challenge.challenge,
        challenge.salt,
        challenge.algorithm,
        challenge.maxnumber,
      );
      const solution = await promise;

      const altchaSolution = {
        ...challenge,
        number: solution?.number,
      };

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
    const oakConversationToken = sessionStorage.getItem(
      OAK_CONVERSATION_TOKEN_KEY,
    );
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
  }, [isEmbed]);

  useEffect(() => {
    if (isEmbed && chatInitialized) {
      onEmbedInit?.(chatSettings);
    }
  }, [isEmbed, chatInitialized, onEmbedInit, chatSettings]);

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

  useEffect(() => {
    if (
      chatInitialized &&
      chatSettings?.initialMessage &&
      !initialMessages?.length &&
      !messages?.length
    ) {
      setMessages([
        {
          id: "initial-message",
          role: MessageRole.Assistant,
          content: chatSettings?.initialMessage,
          parts: [
            {
              type: "text",
              text: chatSettings?.initialMessage,
            } as { type: "text"; text: string },
          ],
        } as Message,
      ]);
    }
  }, [chatSettings?.initialMessage, chatInitialized]);

  const createFileList = (filesArray: File[]): FileList => {
    const dataTransfer = new DataTransfer();
    filesArray.forEach((file) => dataTransfer.items.add(file));
    return dataTransfer.files;
  };

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setFiles([]);
  };

  const handleFormSubmit = useCallback(
    async (event: { preventDefault: () => void }) => {
      event.preventDefault();
      const options = {
        experimental_attachments: files.length
          ? createFileList(files)
          : undefined,
      };
      if (input.trim() === "") {
        return;
      }
      if (window.innerWidth < 768) {
        // blur on mobile to prevent keyboard from showing
        textareaRef.current?.blur();
      }
      clearFileInput();
      let token = "";
      if (isEmbed) {
        token = await validateSessionToken();
      }
      handleSubmit(event, {
        ...options,
        headers: {
          ...(isEmbed && token ? { "x-oak-session-token": token } : {}),
        },
      });
    },
    [handleSubmit, input, files, isEmbed],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent | React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        handleFormSubmit(event);
      }
    },
    [handleFormSubmit],
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
      handleFormSubmit({ preventDefault: () => {} });
    }
  }, [input, handleFormSubmit, chatSettings?.suggestedQuestions]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return {
    conversationId,
    chatSettings,
    toolNames,
    chatInitialized,
    sessionToken,
    sessionTokenIsRefreshing,
    messages,
    input,
    status,
    error: error || null,
    files,
    handleInputChange,
    handleKeyDown,
    handleFormSubmit,
    handleCardSelect,
    handleFileInputChange,
    handleFileButtonClick,
    clearSelectedFile,
    handleDragOver,
    handleDrop,
    supportedFileTypes,
    avatar,
    textareaRef,
    fileInputRef,
    setInput,
  };
};

export default useOakChat;
