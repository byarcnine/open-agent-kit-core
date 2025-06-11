import { prisma } from "@db/db.server";
import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { getCorsHeaderForAgent } from "./utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const origin = request.headers.get("Origin") || "";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-oak-session-token",
      },
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const origin = request.headers.get("Origin") || "";
  const agentId = ""; // Replace with the appropriate agentId value
  const corsHeaders = await getCorsHeaderForAgent(origin, agentId);

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await request.json();
    const { feedback, feedbackType, sentiment, conversationId } = body;

    console.log("Received feedback:", {
      feedback,
      feedbackType,
      sentiment,
      conversationId,
    });

    if (!feedback || !feedbackType || !conversationId) {
      return new Response(
        JSON.stringify({ message: "Missing required fields" }),
        {
          status: 400,
          headers: corsHeaders,
        },
      );
    }

    const savedFeedback = await prisma.feedback.create({
      data: {
        feedback,
        feedbackType,
        sentiment: sentiment || "neutral",
        conversationId,
      },
    });

    return new Response(
      JSON.stringify({
        message: "Feedback collected successfully",
        data: savedFeedback,
      }),
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    console.error("Error saving feedback:", error);
    return new Response(JSON.stringify({ message: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
