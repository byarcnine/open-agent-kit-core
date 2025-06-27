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

const inventionTool = tool({
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
      }),
      prompt: `You are an agentic agent that is used to invent agents.
      You are given a specification and you need to generate an agent based on that specification.
      Generate a cool and concise name, a description and a detailed system prompt for the agent. The system prompt should be precise and explicit, include DOs and DON'Ts,
      and be at least 100 words long.

      The specification is: ${specification}
      `,
    });
    return {
      ...res.object,
    };
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
 The system prompt should be a system prompt for the agent to is precise and explicit. Use markdown to format the system prompt in a way that is easy to read and understand.
 Do not tell the user that you are using tools.

 The agentInventor tool will return a JSON object with the following properties:
 - name: The name of the agent
 - description: The description of the agent
 - systemPrompt: The system prompt of the agent
`,
      tools: {
        __agentInventor: inventionTool,
      },
      onFinish: async (completion) => {
        console.log(completion);
      },
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
