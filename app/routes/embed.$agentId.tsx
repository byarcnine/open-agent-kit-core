import {
  type LoaderFunctionArgs,
  useLoaderData,
  useParams,
  data,
  type HeadersArgs,
} from "react-router";
import Chat from "~/components/chat/chat.client";
import { prisma } from "@db/db.server";
import ClientOnlyComponent from "~/components/clientOnlyComponent/clientOnlyComponent";
import { toolNameIdentifierList } from "~/lib/tools/tools.server";
import { getAllowedUrlsForAgent } from "~/routes/utils";
import { getChatSettings } from "~/lib/llm/chat.server";

export function headers({ loaderHeaders }: HeadersArgs) {
  return loaderHeaders;
}

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const allowedUrls = await getAllowedUrlsForAgent(params.agentId as string);
  const headers = {
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": [
      `default-src 'self';`,
      `script-src 'self' 'unsafe-inline';`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;`,
      `font-src 'self' https://fonts.gstatic.com;`,
      `img-src 'self' data:;`,
      `frame-ancestors 'self' ${allowedUrls.join(" ")}`,
    ].join(" "),
  };

  const { agentId } = params;
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId as string,
    },
  });
  if (!agent) {
    throw data({ error: "Agent not found" }, { status: 404, headers });
  }
  if (!agent.isPublic) {
    throw data({ error: "Agent is not public" }, { status: 403, headers });
  }

  const toolNames = toolNameIdentifierList();
  const chatSettings = await getChatSettings(agentId as string);

  return data(
    { agent, toolNames, chatSettings },
    {
      headers,
    },
  );
};

const ChatEmbed = () => {
  const { agentId } = useParams();
  const loaderData = useLoaderData();

  const { chatSettings, toolNames } = loaderData;
  return (
    <div className="h-screen w-full">
      <ClientOnlyComponent>
        {Chat && (
          <Chat
            apiUrl={window.location.origin}
            isEmbed={true}
            agentId={agentId as string}
            agentChatSettings={chatSettings}
            toolNamesList={toolNames}
          />
        )}
      </ClientOnlyComponent>
    </div>
  );
};

export default ChatEmbed;
