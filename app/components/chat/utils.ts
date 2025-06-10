export const getApiUrl = (isEmbed: boolean, apiUrl?: string): string => {
  return (isEmbed ? (apiUrl ?? "") : window.location.origin).replace(/\/$/, "");
};
