import { prisma } from "@db/db.server";

export const loadConversations = async({ page, agentId, userId, archived = false, take = 25 }: { page: number, agentId: string, userId: string, archived?: boolean, take?: number }) => {
  return await prisma.conversation.findMany({
    where: {
      agentId,
      userId,
      archived,
    },
    orderBy: {
      createdAt: "desc",
    },
    take,
    skip: (page - 1) * take,
    include: {
      messages: {
        take: 1,
        orderBy: {
          createdAt: "asc",
        },
        select: {
          createdAt: true,
        },
      },
    },
  });
};