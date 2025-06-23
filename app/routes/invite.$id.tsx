import { type LoaderFunctionArgs, redirect } from "react-router";
import { prisma } from "@db/db.server";
import { sessionStorage } from "~/lib/sessions.server";
import { handleInvite } from "~/lib/auth/handleInvite.server";
import { getSession } from "~/lib/auth/auth.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const id = params.id as string;
  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) {
    return redirect("/");
  }
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  const user = (await getSession(request))?.user;
  if (user) {
    // if the user is already logged in, add them to the agent
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return redirect("/");
    }
    await handleInvite(dbUser, id);
    return redirect(`/`);
  }
  // if there is no user store the invite code for post signup
  session.set("invite", { code: invitation.id, email: invitation.email });

  const cookie = await sessionStorage.commitSession(session);
  return redirect("/auth/login", {
    headers: { "Set-Cookie": cookie },
  });
};
