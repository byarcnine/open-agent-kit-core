import { prisma } from "../../../prisma/db.server";

const getAllowedUrlsForAgent = async (agentId: string) => {
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

export const getCorsHeaderForAgent = async (origin: string, agentId: string) => {
  const isOriginAllowed = await urlAllowedForAgent(origin, agentId);

  if (isOriginAllowed) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    };
  }
  return {
    "Access-Control-Allow-Origin": "",
    "Access-Control-Allow-Headers": "",
    "Access-Control-Allow-Methods": "",
  };
};
