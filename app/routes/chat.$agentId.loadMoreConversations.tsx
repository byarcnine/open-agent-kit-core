import type { LoaderFunctionArgs } from "react-router";
import { loadConversations } from "./utils/chat";
import { hasAccessHierarchical } from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { agentId } = params;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const take = parseInt(url.searchParams.get("take") || "25");
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["agent.chat"],
    agentId,
  );
  const conversations = await loadConversations({
    page,
    agentId: agentId as string,
    userId: user.id,
    take,
    archived: false,
  });
  return { conversations };
};
