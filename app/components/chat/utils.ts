import React from "react";

export const getApiUrl = (isEmbed: boolean, apiUrl?: string): string => {
  return (isEmbed ? (apiUrl ?? "") : window.location.origin).replace(/\/$/, "");
};

/**
 * Safely renders text with clickable URLs while preventing XSS attacks
 * Supports markdown-style links: [text](url)
 * @param text - The text that may contain URLs or markdown links
 * @returns Array of React elements (text and link elements)
 */
export const renderTextWithSecureLinks = (text: string): (string | React.ReactElement)[] => {
  // First handle markdown-style links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  const result: (string | React.ReactElement)[] = [];

  let match;
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const linkText = match[1];
    const url = match[2];

    if (url.startsWith('http://') || url.startsWith('https://')) {
      result.push(React.createElement('a', {
        key: result.length,
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'oak-chat__footer-link'
      }, linkText));
    } else {
      // If URL is not safe, just add the text
      result.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);

    // Handle plain URLs in remaining text
    const urlRegex = /(https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?)/gi;
    const parts = remainingText.split(urlRegex);

    parts.forEach((part, index) => {
      if (urlRegex.test(part)) {
        if (part.startsWith('http://') || part.startsWith('https://')) {
          result.push(React.createElement('a', {
            key: result.length,
            href: part,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'oak-chat__footer-link'
          }, part));
        } else {
          result.push(part);
        }
      } else {
        result.push(part);
      }
    });
  }

  return result;
};


