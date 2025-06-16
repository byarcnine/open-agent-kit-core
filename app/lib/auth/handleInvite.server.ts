import {
  GlobalUserRole,
  InvitationType,
  prisma,
  AgentUserRole,
} from "@db/db.server";
import type { SessionUser } from "~/types/auth";
// import { sendAgentAddedConfirmation } from "../email/sendAgentAddedConfirmation.server";
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
  await prisma.userPermissionGroup.upsert({
    where: {
      userId_permissionGroupId: {
        userId: user.id,
        permissionGroupId: invite.permissionGroupId,
      },
    },
    create: {
      userId: user.id,
      permissionGroupId: invite.permissionGroupId,
    },
    update: {},
  });
  await prisma.invitation.delete({
    where: {
      id: invite.id,
    },
  });
};

export const createInvitation = async (
  email: string,
  permissionGroupId: string,
) => {
  // check if user exists
  const user = await prisma.user.findUnique({ where: { email } });
  const permissionGroup = await prisma.permissionGroup.findUnique({
    where: { id: permissionGroupId },
  });
  if (!permissionGroup) {
    return { error: "Permission group not found", success: false };
  }
  if (user) {
    // Check if user is already in agent
    const existingAgentUser = await prisma.userPermissionGroup.findFirst({
      where: {
        userId: user.id,
        permissionGroupId,
      },
    });

    if (existingAgentUser) {
      return {
        error: "User is already a member of this agent",
        success: true,
      };
    }

    await prisma.userPermissionGroup.create({
      data: { userId: user.id, permissionGroupId },
    });
    // await sendAgentAddedConfirmation(
    //   user.email,
    //   permissionGroup.name,
    //   permissionGroupId,
    // );
  } else {
    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findFirst({
      where: { email, permissionGroupId },
    });

    if (existingInvitation) {
      return {
        error: "An invitation has already been sent to this email",
        success: false,
      };
    }

    const invitation = await prisma.invitation.create({
      data: { email, permissionGroupId },
    });
    const inviteLink = `${APP_URL()}/invite/${invitation.id}`;
    await sendInvitationEmail(email, inviteLink);
  }
};
