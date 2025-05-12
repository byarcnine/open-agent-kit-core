import {
  useEffect,
  useRef,
  type RefObject,
  useState,
  useCallback,
} from "react";

const SCROLL_THRESHOLD = 100; // pixels from bottom to consider "at bottom"
const SCROLL_DEBOUNCE = 150; // ms to wait before considering scroll stopped

export function useScrollToBottom<T extends HTMLElement>(): [
  RefObject<T | null>,
  RefObject<T | null>,
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const isScrollingRef = useRef(false);

  const scrollToBottom = useCallback(
    (smooth = true) => {
      const container = containerRef.current;
      const end = endRef.current;
      if (!container || !end || !shouldAutoScroll) return;

      const scrollOptions = {
        behavior: smooth ? "smooth" : ("auto" as ScrollBehavior),
        block: "end" as ScrollLogicalPosition,
      };

      // Use requestAnimationFrame to ensure smooth animation
      requestAnimationFrame(() => {
        end.scrollIntoView(scrollOptions);
      });
    },
    [shouldAutoScroll],
  );

  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      const observer = new MutationObserver(() => {
        if (shouldAutoScroll && !isScrollingRef.current) {
          scrollToBottom(true);
        }
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      const handleScroll = () => {
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceFromBottom = scrollHeight - clientHeight - scrollTop;
        const isAtBottom = distanceFromBottom < SCROLL_THRESHOLD;

        // Clear any existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        // Set scrolling state
        isScrollingRef.current = true;

        // Update auto-scroll state after scroll stops
        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false;
          setShouldAutoScroll(isAtBottom);
        }, SCROLL_DEBOUNCE);
      };

      container.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        observer.disconnect();
        container.removeEventListener("scroll", handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, [shouldAutoScroll, scrollToBottom]);

  return [containerRef, endRef];
}

export default useScrollToBottom;
