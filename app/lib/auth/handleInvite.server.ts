import { prisma } from "@db/db.server";
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
  permissionGroupIds: string[],
) => {
  // check if user exists
  const user = await prisma.user.findUnique({ where: { email } });
  const permissionGroups = await prisma.permissionGroup.findMany({
    where: { id: { in: permissionGroupIds } },
  });
  if (permissionGroups.length !== permissionGroupIds.length) {
    return { error: "Permission group not found", success: false };
  }
  if (user) {
    await prisma.userPermissionGroup.createMany({
      data: permissionGroups.map((group) => ({
        userId: user.id,
        permissionGroupId: group.id,
      })),
      skipDuplicates: true,
    });
  } else {
    const invitation = await Promise.all(
      permissionGroups.map(
        async (permissionGroup) =>
          await prisma.invitation.upsert({
            where: {
              email_permissionGroupId: {
                email,
                permissionGroupId: permissionGroup.id,
              },
            },
            create: { email, permissionGroupId: permissionGroup.id },
            update: {},
          }),
      ),
    );
    const inviteLink = `${APP_URL()}/invite/${invitation[0].id}`;
    try {
      await sendInvitationEmail(email, inviteLink);
    } catch (error) {
      console.error(error);
    }
  }
};
