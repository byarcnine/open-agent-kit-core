import { betterAuth, type BetterAuthPlugin, type Session } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { GlobalUserRole, prisma } from "@db/db.server";
import { sendPasswordResetEmail } from "~/lib/email/sendPasswordResetEmail.server";
import { createAuthMiddleware } from "better-auth/api";
import { sessionStorage } from "../sessions.server";
import { handleInvite } from "./handleInvite.server";
import type { SessionUser } from "~/types/auth";
import { APP_URL } from "../config/config";

export const oakDefaultAuthPlugin = () =>
  ({
    id: "oakDefaultAuthPlugin",
    schema: {
      user: {
        fields: {
          role: {
            type: "string", // string, number, boolean, date
            required: true, // if the field should be required on a new record. (default: false)
            unique: false, // if the field should be unique. (default: false)
            defaultValue: GlobalUserRole.VIEW_EDIT_ASSIGNED_AGENTS,
          },
        },
      },
    },
  } satisfies BetterAuthPlugin);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  secret: process.env.APP_SECRET as string,
  baseURL: APP_URL(),
  trustedOrigins: [APP_URL()],
  plugins: [oakDefaultAuthPlugin()],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // Remove role from any user data being sent from client
      if (ctx.body?.role) {
        throw new Error("Role is not allowed to be set");
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (!ctx.request) return;

      const userCount = await prisma.user.count();
      if (userCount === 1) {
        const userId = ctx.context.newSession?.user.id;
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { role: GlobalUserRole.SUPER_ADMIN },
          });
        }
      }

      // 1. Check if the invite is in the session
      const session = await sessionStorage.getSession(
        ctx.request.headers.get("Cookie")
      );
      const user = ctx.context.newSession?.user;
      const invite = session.get("invite");
      if (invite && user) {
        await handleInvite(user as SessionUser, invite.code);
      }
    }),
  },
});

export const getSession = (request: Request) => {
  return auth.api.getSession({
    headers: request.headers,
  }) as Promise<{
    user: SessionUser;
    session: Session;
  }>;
};

export const getUser = async (request: Request) => {
  const session = await getSession(request);
  return session?.user;
};
