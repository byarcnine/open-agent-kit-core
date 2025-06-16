import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import debug from "debug";

export const log = debug("oak");

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function openBase64Pdf(dataUrl: string) {
  // Extract base64 string from data URL
  const base64String = dataUrl.split(",")[1];

  // Convert base64 to a Blob
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length)
    .fill(0)
    .map((_, i) => byteCharacters.charCodeAt(i));
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/pdf" });

  // Create a Blob URL and open it in a new tab
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
}
