import { Outlet, useNavigate, useParams, type LoaderFunctionArgs, useMatches } from "react-router";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { FileText, Settings } from "react-feather";
import { prisma } from "@db/db.server";
import { sessionStorage } from "~/lib/sessions.server";
import { data } from "react-router";
import { Toaster } from "sonner";

const enum TAB_TYPE {
  DOCUMENTS = "",
  SETTINGS = "settings",
}

const TABS = [
  {
    label: "Documents",
    value: TAB_TYPE.DOCUMENTS,
    icon: <FileText className="w-4 h-4 mr-2" />,
  },
  {
    label: "Settings",
    value: TAB_TYPE.SETTINGS,
    icon: <Settings className="w-4 h-4 mr-2" />,
  },
];

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const agentId = params.agentId as string;
  const files = await prisma.knowledgeDocument.findMany({
    where: { agentId },
  });
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const message = session.get("message");
  return data(
    { files, message },
    {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      },
    }
  );
};

const KnowledgeBaseView = () => {
  const navigate = useNavigate();
  const { agentId } = useParams();
  const matches = useMatches();

  const activeTab = matches.some(match => match.pathname.endsWith(`knowledge/settings`))
    ? TAB_TYPE.SETTINGS
    : TAB_TYPE.DOCUMENTS;

  const handleTabChange = (value: string) => {
    navigate(`/agent/${agentId}/knowledge/${value}`);
  };

  return (
    <div className="p-6 w-full">
      <h1 className="text-3xl font-medium tracking-tight my-8">Knowledge Base</h1>
      <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-2 w-fit mb-8">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.icon}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <Outlet />
      </Tabs>
      <Toaster expand={true} />
    </div>
  );
};

export default KnowledgeBaseView;