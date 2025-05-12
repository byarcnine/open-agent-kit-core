import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  data,
} from "react-router";
import { getCorsHeaderForAgent } from "./utils";
import jwt from 'jsonwebtoken';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const origin = request.headers.get("Origin") || "";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const body = await request.json();
  const agentId = body.agentId;
  const altchaToken = body.altchaToken;

  const corsHeaders = await getCorsHeaderForAgent(
    request.headers.get("Origin") as string,
    agentId
  );

  const res = await fetch("https://api.altcha.org/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: altchaToken }),
  });
  const resData = await res.json();
  if (!resData.success) {
    return data({ error: "Verification failed" }, { status: 403, headers: corsHeaders });
  }

  const jwtToken = jwt.sign(
    { verified: true },
    process.env.APP_SECRET!,
    { expiresIn: "1h" }
  );
  return data({ jwt: jwtToken }, { status: 200, headers: corsHeaders });
};
