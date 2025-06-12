import { prisma } from "../../../prisma/db.server";

// CORS header constants
export const CORS_ALLOW_HEADERS = "Content-Type, Authorization, x-oak-session-token";
export const CORS_ALLOW_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
export const CORS_EXPOSE_HEADERS = "x-conversation-id, x-oak-conversation-token";

export const getAllowedUrlsForAgent = async (agentId: string) => {
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
  });
  return agent?.allowedUrls || [];
};

export const urlAllowedForAgent = async (origin: string, agentId: string) => {
  const allowedUrls = await getAllowedUrlsForAgent(agentId);
  const isOriginAllowed = allowedUrls.some((url) => {
    const regex = new RegExp(`^${url.replace(/\*/g, ".*")}$`);
    return regex.test(origin);
  });

  return isOriginAllowed;
};

export const getCorsHeaderForAgent = async (
  origin: string,
  agentId: string,
) => {
  const isOriginAllowed = await urlAllowedForAgent(origin, agentId);

  if (isOriginAllowed) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
      "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
      "Access-Control-Expose-Headers": CORS_EXPOSE_HEADERS,
    };
  }
  return {
    "Access-Control-Allow-Origin": "",
    "Access-Control-Allow-Headers": "",
    "Access-Control-Allow-Methods": "",
    "Access-Control-Expose-Headers": "",
  };
};
