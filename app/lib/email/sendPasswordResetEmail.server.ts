import { getMailer } from "./mailer";
import { renderedOAKEmail } from "./template";

export const sendPasswordResetEmail = async (email: string, url: string) => {
  const html = await renderedOAKEmail(
    "Password Reset",
    "We received a request to reset your password. Click the button below to reset it.",
    { label: "Reset Password", url }
  );
  await getMailer().sendMail({
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: "OAK - Password Reset Request",
    html,
  });
};
