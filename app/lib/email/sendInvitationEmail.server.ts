import { getMailer } from "./mailer";
import { renderedOAKEmail } from "./template";

export const sendInvitationEmail = async (
  email: string,
  inviteLink: string
) => {
  const html = await renderedOAKEmail(
    "Invitation to join an agent",
    "You have been invited to join an agent. Click the button below to sign up and start using OAK.",
    { label: "Join Agent", url: inviteLink }
  );
  await getMailer().sendMail({
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: "OAK - Invitation to join an agent",
    html,
  });
};
