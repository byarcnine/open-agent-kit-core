import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { getCorsHeaderForAgent } from "./utils";
import jwt from "jsonwebtoken";
import { createChallenge, verifySolution } from "altcha-lib";

const HMAC_KEY = process.env.APP_SECRET!;

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

  const challenge = await createChallenge({
    hmacKey: HMAC_KEY,
    expires: new Date(Date.now() + 5 * 60 * 1000),
    maxnumber: 200_000,
  });

  return new Response(
    JSON.stringify(challenge),
    {
      status: 200,
      headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-oak-session-token",
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const body = await request.json();
  const agentId = body.agentId;
  const altchaSolution = body.altchaSolution;

  const corsHeaders = await getCorsHeaderForAgent(
    request.headers.get("Origin") as string,
    agentId,
  );

  const isValid = await verifySolution(altchaSolution, HMAC_KEY);
  if (!isValid) {
    return new Response(
      JSON.stringify({ error: "Captcha verification failed" }),
      { status: 403, headers: corsHeaders },
    );
  }

  const jwtToken = jwt.sign({ verified: true }, process.env.APP_SECRET!, {
    expiresIn: "15m",
  });
  return new Response(
    JSON.stringify({ jwt: jwtToken }),
    { status: 200, headers: corsHeaders },
  );
};
