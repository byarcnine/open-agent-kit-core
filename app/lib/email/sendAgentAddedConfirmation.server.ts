import { APP_URL } from "../config/config";
import { getMailer } from "./mailer";
import { renderedOAKEmail } from "./template";

export const sendAgentAddedConfirmation = async (
  email: string,
  agentName: string,
  agentId: string
) => {
  const agentUrl = new URL(`/agent/${agentId}`, APP_URL());
  const html = await renderedOAKEmail(
    "Agent Added",
    `You have been given permission to access the agent "${agentName}". Click the button below to view the agent.`,
    { label: "View Agent", url: agentUrl.toString() }
  );
  await getMailer().sendMail({
    to: email,
    from: process.env.SENDER_EMAIL,
    subject: "OAK - You have been added to an agent",
    html,
  });
};
