import {
  GlobalUserRole,
  InvitationType,
  prisma,
  AgentUserRole,
} from "@db/db.server";
import type { SessionUser } from "~/types/auth";
import { sendAgentAddedConfirmation } from "../email/sendAgentAddedConfirmation.server";
import { sendInvitationEmail } from "../email/sendInvitationEmail.server";
import { APP_URL } from "../config/config";

export const handleInvite = async (user: SessionUser, invitationId: string) => {
  const invite = await prisma.invitation.findUnique({
    where: {
      id: invitationId,
    },
  });
  if (!invite) {
    return;
  }
  if (invite.type === InvitationType.AGENT && invite.agentId) {
    await prisma.agentUser.create({
      data: {
        userId: user.id,
        agentId: invite.agentId,
        role: invite.agentRole ?? AgentUserRole.VIEWER,
      },
    });
  }
  if (invite.type === InvitationType.GLOBAL) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: invite.globalRole ?? GlobalUserRole.VIEW_EDIT_ASSIGNED_AGENTS,
      },
    });
  }
  await prisma.invitation.delete({
    where: {
      id: invite.id,
    },
  });
};

export const createInvitation = async (
  email: string,
  agentId: string,
  agentRole: AgentUserRole
) => {
  // check if user exists
  const user = await prisma.user.findUnique({ where: { email } });
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) {
    return { error: "Agent not found", success: false };
  }
  if (user) {
    // Check if user is already in agent
    const existingAgentUser = await prisma.agentUser.findUnique({
      where: { userId_agentId: { userId: user.id, agentId } },
    });

    if (existingAgentUser) {
      return {
        error: "User is already a member of this agent",
        success: false,
      };
    }

    await prisma.agentUser.create({
      data: { userId: user.id, agentId, role: agentRole },
    });
    await sendAgentAddedConfirmation(user.email, agent?.name, agentId);
  } else {
    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findFirst({
      where: { email, agentId },
    });

    if (existingInvitation) {
      return {
        error: "An invitation has already been sent to this email",
        success: false,
      };
    }

    const invitation = await prisma.invitation.create({
      data: { email, agentId, agentRole },
    });
    const inviteLink = `${APP_URL()}/invite/${invitation.id}`;
    await sendInvitationEmail(email, inviteLink);
  }
};
