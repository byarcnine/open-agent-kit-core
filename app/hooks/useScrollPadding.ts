import { useState, useEffect, useRef, useCallback } from "react";
import { type UseChatHelpers } from "@ai-sdk/react";

export function useScrollPadding<T extends HTMLElement>(
  status?: UseChatHelpers["status"],
  disableScrolling?: boolean,
) {
  const messagesContainerRef = useRef<T>(null);
  const [scrollPadding, setScrollPadding] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleScrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
    setIsAtBottom(isBottom);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Set up scroll listener
    container.addEventListener("scroll", checkIfAtBottom);
    checkIfAtBottom(); // Initial check

    // Set up mutation observer for content changes
    const observer = new MutationObserver(checkIfAtBottom);
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      container.removeEventListener("scroll", checkIfAtBottom);
      observer.disconnect();
    };
  }, [checkIfAtBottom]);

  useEffect(() => {
    if (status === "submitted" && !disableScrolling) {
      const messageDivs = messagesContainerRef.current?.querySelectorAll(
        ".oak-chat__message--user > div",
      );
      const lastUserMessage = messageDivs
        ? messageDivs[messageDivs.length - 1]
        : null;
      const containerHeight = messagesContainerRef.current?.clientHeight ?? 0;
      const lastUserMessageHeight = lastUserMessage?.clientHeight ?? 0;
      setScrollPadding(containerHeight - lastUserMessageHeight - 50);
      requestAnimationFrame(() => {
        handleScrollToBottom();
      });
    }
  }, [status, disableScrolling, handleScrollToBottom]);

  return {
    scrollPadding,
    messagesContainerRef,
    isAtBottom,
    scrollToBottom: handleScrollToBottom,
  };
}

export const mergeRefs = <T>(...refs: React.Ref<T>[]): React.Ref<T> => {
  return (node: T) => {
    for (const ref of refs) {
      if (ref && typeof ref === "object") {
        (ref as React.RefObject<T>).current = node;
      } else if (typeof ref === "function") {
        ref(node);
      }
    }
  };
};

export default useScrollPadding;
