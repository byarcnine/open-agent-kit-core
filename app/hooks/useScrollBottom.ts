import { useEffect, useRef, useCallback, useState } from "react";
import { type UseChatHelpers } from "@ai-sdk/react";

export function useScrollToBottom<T extends HTMLElement>(
  status?: UseChatHelpers["status"],
  disableScrolling?: boolean,
) {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  const [hasSentMessage, setHasSentMessage] = useState(false);
  const [scrollPadding, setScrollPadding] = useState(0);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkIfCanScrollDown = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const isScrollable = container.scrollHeight > container.clientHeight;
    const isAtBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + 20;
    setCanScrollDown(isScrollable && !isAtBottom);
  }, []);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      const container = containerRef.current;
      const end = endRef.current;
      if (!container || !end) return;

      end.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
      checkIfCanScrollDown();
    },
    [checkIfCanScrollDown],
  );

  useEffect(() => {
    scrollToBottom(false);
  }, []);

  useEffect(() => {
    if (disableScrolling && status === "submitted") {
      // only scroll to bottom because a new message is being sent
      scrollToBottom(false);
      return;
    }

    if (status === "submitted" && !disableScrolling) {
      setHasSentMessage(true);
      const messageDivs = containerRef.current?.querySelectorAll(
        ".oak-chat__message--user > div",
      );
      const lastUserMessage = messageDivs
        ? messageDivs[messageDivs.length - 1]
        : null;
      const containerHeight = containerRef.current?.clientHeight ?? 0;
      const lastUserMessageHeight = lastUserMessage?.clientHeight ?? 0;
      setScrollPadding(containerHeight - lastUserMessageHeight - 50);
      setTimeout(() => {
        scrollToBottom(false);
      }, 100);
    }
  }, [status, scrollToBottom, disableScrolling]);

  // Add scroll event listener to check scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkIfCanScrollDown();
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [checkIfCanScrollDown]);

  // Check for content changes using MutationObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      checkIfCanScrollDown();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [checkIfCanScrollDown]);

  return {
    scrollToBottom,
    containerRef,
    endRef,
    hasSentMessage,
    scrollPadding,
    canScrollDown,
  };
}

export default useScrollToBottom;
