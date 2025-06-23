import { prisma } from "@db/db.server";
import { getConfig } from "../config/config";
import { generateObject, generateText } from "ai";
import { z } from "zod";

export const inventAgent = async (
  spaceId: string,
  agentName: string,
  task: string,
) => {
  const systemPrompt = `
  You are an experting in prompt engineering.
  You are given a task and you need to invent an agent that can help me with the task.
  The agent should be able to handle the task and return the result.

  Return the system prompt for the agent as a markdown string.
  `;
  const config = getConfig();
  const model = config.models[0];
  const systemPromptForAgent = await generateText({
    model: model,
    system: systemPrompt,
    prompt: task,
  });

  const enabledDefaults = await generateObject({
    model: model,
    schema: z.object({
      captureFeedback: z.boolean(),
      hasKnowledgeBase: z.boolean(),
    }),
    prompt: `
    A new agent is being created with the following task: ${task}.
    The generated system prompt is: ${systemPromptForAgent.text}.
    You are given a list of default settings for the agent.

    Options:
    - captureFeedback: true if the agent should capture feedback from the user.
    - hasKnowledgeBase: true if the agent should have a knowledge base and the ability to retrieve documents from the knowledge base.

    Return the default settings for the agent as a JSON object.
    `,
  });

  const agent = await prisma.agent.create({
    data: {
      name: agentName,
      spaceId: spaceId,
      agentSettings: {
        captureFeedback: enabledDefaults.object.captureFeedback,
        hasKnowledgeBase: enabledDefaults.object.hasKnowledgeBase,
        trackingEnabled: true,
      },
      systemPrompts: {
        create: {
          key: "default",
          prompt: systemPromptForAgent.text,
        },
      },
    },
  });
  return agent;
};
