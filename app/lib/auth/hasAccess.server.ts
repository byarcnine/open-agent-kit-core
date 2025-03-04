import { type LoaderFunctionArgs, redirect } from "react-router";
import { AgentUserRole, prisma } from "@db/db.server";
import { getSession } from "~/lib/auth/auth.server";
import { PERMISSIONS, type SessionUser } from "~/types/auth";

export const hasPermission = async (
  user: SessionUser,
  permission: PERMISSIONS,
  agentId?: string
) => {
  if (user.role === "SUPER_ADMIN") return true;
  switch (permission) {
    case PERMISSIONS.EDIT_AGENT:
      if (user.role === "EDIT_ALL_AGENTS") return true;
      if (agentId) {
        const agentUser = await prisma.agentUser.findFirst({
          where: { userId: user.id, agentId },
        });
        return (
          agentUser?.role === AgentUserRole.OWNER ||
          agentUser?.role === AgentUserRole.EDITOR
        );
      }
      return false;
    case PERMISSIONS.VIEW_AGENT:
      if (user.role === "VIEW_ALL_AGENTS") return true;
      if (user.role === "EDIT_ALL_AGENTS") return true;
      if (agentId && user.id) {
        const agentUser = await prisma.agentUser.findFirst({
          where: { userId: user.id, agentId },
        });
        return !!agentUser;
      } else if (agentId) {
        const agent = await prisma.agent.findUnique({
          where: { id: agentId },
        });
        if (agent?.isPublic) return true;
      }
      return false;
    case PERMISSIONS.DELETE_AGENT:
      if (agentId) {
        const agentUser = await prisma.agentUser.findFirst({
          where: { userId: user.id, agentId },
        });
        return agentUser?.role === AgentUserRole.OWNER;
      }
      return false;
    case PERMISSIONS.ACCESS_OAK:
      return !!user;
  }
  return false;
};

export const hasAccess = async (
  request: LoaderFunctionArgs["request"],
  requiredPermission: PERMISSIONS,
  agentId?: string
) => {
  const session = await getSession(request);
  const user = session?.user;

  if (!user) throw redirect("/auth/login");
  if (await hasPermission(user, requiredPermission, agentId)) return user;
  throw new Error("Unauthorized");
};

// export const getUserAgentPermission = async (
//   user: SessionUser,
//   agentId: string
// ): Promise<AgentUserRole> => {
//   if (user.role === "SUPER_ADMIN") return AgentUserRole.OWNER;
//   const agentUser = await prisma.agentUser.findFirst({
//     where: { userId: user.id, agentId },
//   });
//   return agentUser?.role ?? AgentUserRole.VIEWER; // TODO: fix this. The user should be able to access the agent even if they are not an agent user or global admin
// };

export const canUserAccessAgent = async (
  user: SessionUser | undefined,
  agentId: string
): Promise<boolean> => {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (agent?.isPublic) return true;
  if (!user) return false;
  return hasPermission(user, PERMISSIONS.VIEW_AGENT, agentId);
};

export const getUserAgentRole = async (
  user: SessionUser,
  agentId: string
): Promise<AgentUserRole> => {
  if (user.role === "SUPER_ADMIN") return AgentUserRole.OWNER;
  if (user.role === "EDIT_ALL_AGENTS") return AgentUserRole.EDITOR;
  const agentUser = await prisma.agentUser.findFirst({
    where: { userId: user.id, agentId },
  });
  return agentUser?.role ?? AgentUserRole.VIEWER;
};
