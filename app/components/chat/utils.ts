import React from "react";

export const getApiUrl = (isEmbed: boolean, apiUrl?: string): string => {
  return (isEmbed ? (apiUrl ?? "") : window.location.origin).replace(/\/$/, "");
};

/**
 * Checks if a URL is safe to render as a link (http/https only)
 */
const isSafeUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Must start with http:// or https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return false;
  }

  // Additional safety: check for dangerous protocols in the URL
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('javascript:') ||
      lowerUrl.includes('data:') ||
      lowerUrl.includes('file:') ||
      lowerUrl.includes('vbscript:')) {
    return false;
  }

  return true;
};

/**
 * Creates a safe link element
 */
const createSafeLink = (url: string, text: string, key: number): React.ReactElement => {
  return React.createElement('a', {
    key,
    href: url,
    target: '_blank',
    rel: 'noopener noreferrer',
    className: 'oak-chat__footer-link'
  }, text);
};

/**
 * Safely renders text with clickable URLs while preventing XSS attacks
 * Supports markdown-style links: [text](url)
 * @param text - The text that may contain URLs or markdown links
 * @returns Array of React elements (text and link elements)
 */
export const renderTextWithSecureLinks = (text: string): (string | React.ReactElement)[] => {
  // Input validation
  if (typeof text !== 'string') {
    return [String(text)];
  }

  if (!text.trim()) {
    return [text];
  }

  const markdownLinkRegex = /\[([^\]]*)\]\(([^)]*)\)/g;
  let lastIndex = 0;
  const result: (string | React.ReactElement)[] = [];

  try {
    let match;
    let iterationCount = 0;
    const maxIterations = 1000; // Prevent runaway loops

    while ((match = markdownLinkRegex.exec(text)) !== null) {
      iterationCount++;
      if (iterationCount > maxIterations) {
        console.warn('Too many markdown links detected, stopping parsing');
        break;
      }

      // Prevent infinite loop by checking match length
      if (match[0].length === 0) {
        console.warn('Empty markdown link match detected, skipping');
        break;
      }

      // Bounds checking
      if (match.index >= text.length) {
        console.warn('Match index out of bounds, stopping parsing');
        break;
      }

      // Add text before the link
      if (match.index > lastIndex) {
        result.push(text.slice(lastIndex, match.index));
      }

      const linkText = match[1];
      const url = match[2];

      // Validate markdown link components
      if (!linkText || !url || linkText.trim() === '' || url.trim() === '') {
        // Malformed markdown, treat as plain text
        result.push(match[0]);
      } else if (isSafeUrl(url)) {
        result.push(createSafeLink(url, linkText, result.length));
      } else {
        // If URL is not safe, just add the text
        result.push(match[0]);
      }

      lastIndex = match.index + match[0].length;

      // Additional bounds checking
      if (lastIndex >= text.length) {
        break;
      }
    }

    // Add remaining text with bounds checking
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);

      // Create new regex instance for URL parsing
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const parts = remainingText.split(urlRegex);

      parts.forEach((part, index) => {
        // Odd indices are the matched URLs (capture groups)
        if (index % 2 === 1) {
          if (isSafeUrl(part)) {
            result.push(createSafeLink(part, part, result.length));
          } else {
            result.push(part);
          }
        } else {
          // Even indices are the text between URLs
          result.push(part);
        }
      });
    }

    return result;
  } catch (error) {
    // Fallback: return original text if parsing fails
    console.warn('Error parsing text with links:', error);
    return [text];
  }
};


