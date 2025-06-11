import { prisma } from "@db/db.server";
import type { SessionUser } from "~/types/auth";

export const scaffoldInitialGroup = async (user: SessionUser) => {
  const permissionGroup = await prisma.permissionGroup.create({
    data: {
      name: "Super Admins",
      description: "All permissions on the entire instance",
      permissions: {
        create: {
          scope: "global.super_admin",
          referenceId: "global",
        },
      },
      userPermissionGroups: {
        create: {
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      },
    },
  });
  return permissionGroup;
};
