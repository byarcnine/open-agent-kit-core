import type { LoaderFunctionArgs } from "react-router";
import { hasAccess } from "~/lib/auth/hasAccess.server";
import { PERMISSIONS } from "~/types/auth";
import { loadConversations } from "./utils/chat";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { agentId } = params;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const take = parseInt(url.searchParams.get("take") || "25");
  const user = await hasAccess(request, PERMISSIONS.VIEW_AGENT, agentId);
  const conversations = await loadConversations({ page, agentId: agentId as string, userId: user.id, take });
  return { conversations };
};