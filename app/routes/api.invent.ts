import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import {
  CORS_ALLOW_HEADERS,
  CORS_ALLOW_METHODS,
  CORS_EXPOSE_HEADERS,
} from "./utils";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
import { generateObject, streamText, tool } from "ai";
import { getConfig } from "~/lib/config/config";
import { z } from "zod";
import { getPluginsForSpace } from "~/lib/plugins/availability.server";
import type { AgentInventorToolResult } from "~/components/inventAgent/inventAgentChat.client";
import slugify from "slugify";
import { prisma } from "@db/db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const origin = request.headers.get("Origin") || "";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
        "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
        "Access-Control-Expose-Headers": CORS_EXPOSE_HEADERS,
      },
    });
  }
};

const inventionTool = (spaceId: string) =>
  tool({
    description:
      "This tool is used to generate the agent based on the users specification",
    parameters: z.object({
      specification: z.string(),
    }),
    execute: async ({ specification }) => {
      const config = getConfig();
      const res = await generateObject({
        model: config.models[0],
        schema: z.object({
          name: z.string(),
          description: z.string(),
          systemPrompt: z.string(),
          needsKnowledgeBase: z.boolean(),
          shouldCaptureFeedback: z.boolean(),
          shouldTrackConversation: z.boolean(),
          needsDocumentUpload: z.boolean(),
        }),
        prompt: `You are an agentic agent that is used to invent agents.
      You are given a specification and you need to generate an agent based on that specification.
      Generate a cool and concise name, a description and a detailed system prompt for the agent. The system prompt should be precise and explicit, include DOs and DON'Ts,
      and be at least 100 words long.

      Format the system prompt in markdown. Use headings, lists, and other markdown features to make it easy to read and understand.

      Generate in the same language as the specification.

      Based on the agent you are inventing also decide if it needs a knowledge base, if it should capture feedback and if it should track the conversation.
      - needsKnowledgeBase: Whether the agent needs a knowledge base
      - shouldCaptureFeedback: Whether the agent should capture feedback
      - shouldTrackConversation: Whether the agent should track the conversation
      - needsDocumentUpload: Whether the agent needs to upload documents to fulfill its task

      The specification is: ${specification}
      `,
      });
      const availablePlugins = await getPluginsForSpace(spaceId);
      const prompt = res.object.systemPrompt;
      const recommenderResponse = await generateObject({
        model: config.models[0],
        schema: z.object({
          plugins: z.array(z.string()),
        }),
        prompt: `You are an agentic agent that is used to invent agents.
      You are given a list of plugins and a specification.
      You need to recommend the best plugins for the agent based on the specification.
      The specification is: ${prompt}
      The plugins are: ${availablePlugins.map((p) => `${p.name}: ${p.description}`).join("\n\n")}
      Carefully inspect the description and only recommend plugins that are relevant to the specification.
      `,
      });
      const recommendedSlug = slugify(res.object.name, { lower: true });
      const alreadyWithSlug = await prisma.agent.count({
        where: {
          id: {
            startsWith: recommendedSlug,
          },
        },
      });
      const slug =
        alreadyWithSlug > 0
          ? `${recommendedSlug}-${alreadyWithSlug + 1}`
          : recommendedSlug;
      return {
        ...res.object,
        plugins: availablePlugins,
        recommendedActivePlugins: recommenderResponse.object.plugins,
        slug,
      } satisfies AgentInventorToolResult;
    },
  });

export const action = async ({ request }: ActionFunctionArgs) => {
  const body = await request.json();
  const spaceId = body.spaceId;

  await hasAccessHierarchical(request, "space.create_agent", spaceId);
  const config = await getConfig();

  try {
    const stream = streamText({
      model: config.models[0],
      messages: body.messages,
      system: `You goal is it to define an agentic agent for a user. A agent consists of a name, a description and a system prompt.
 You'll need to find out what the user wants and then generate an agent based on that. The user shall not be asked to provide any direct information.
 Once you have collected enough information you can call the 'agentInventor' tool to generate the agent.
 The name should be human, like a colleague or a friend.
 The description should be a short description of the agent.
 The system prompt should be a system prompt for the agent to is precise and explicit. Use markdown to format the system prompt and structure it in a way that is easy to read and understand (e.g. headings, lists, etc.).
 Do not use placeholders in the system prompt. If you are unsure ask the user for clarification.
 Do not tell the user that you are using tools.
 When the user requests changes always call the tool again with an updated specification.

 Use the same language as the user.

 The agentInventor tool will return a JSON object with the following properties:
 - name: The name of the agent
 - description: The description of the agent
 - systemPrompt: The system prompt of the agent

`,
      tools: {
        __agentInventor: inventionTool(spaceId),
      },
      // onFinish: async (completion) => {
      //   console.log(completion);
      // },
    });

    return stream.toDataStreamResponse({
      getErrorMessage(error) {
        if (process.env.NODE_ENV === "development") {
          if (error instanceof Error) {
            return error.message;
          }
          return "An error occurred";
        }
        return "An error occurred";
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
    });
  }
};
