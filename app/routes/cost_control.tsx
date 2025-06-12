import {
  useFetcher,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";

import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";

import {
  allowedAgentsDetailsInSpaceForUser,
  allowedSpacesToViewForUser,
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import { prisma } from "@db/db.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { SessionUser } from "~/types/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Home, MoreVertical, User } from "react-feather";
import { Badge } from "~/components/ui/badge";
import Warning from "~/components/ui/warning";
import { Card } from "~/components/ui/card";
import Bubble from "~/components/ui/bubble";
import TokenProgressBar from "~/components/ui/tokenProgressBar";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.super_admin"],
  );

  const userScopes = await getUserScopes(user);

  const allowedSpaces = await allowedSpacesToViewForUser(user);
  const spaces = await prisma.space.findMany({
    include: {
      _count: {
        select: {
          agents: true,
        },
      },
    },
    where: {
      id: {
        in: allowedSpaces,
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const spacesWithAgents = await Promise.all(
    spaces.reverse().map(async (space) => {
      const allowedAgents = await allowedAgentsDetailsInSpaceForUser(
        user,
        space.id,
      );
      return {
        ...space,
        allowedAgents,
      };
    }),
  );

  return {
    user: user as SessionUser,
    userScopes,
    spacesWithAgents,
  };
};

export const action = async ({ request, params }: LoaderFunctionArgs) => {
  return {};
};

const CostControl = () => {
  const { user, userScopes, spacesWithAgents } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  console.log(spacesWithAgents);
  return (
    <Layout navComponent={<OverviewNav userScopes={userScopes} />} user={user}>
      <div className="w-full py-8 px-4 md:p-8 flex flex-col">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-medium">Cost Control Management</h1>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
            <h2 className="text-xl font-medium">
              Token Usage by Space, Agent & User
            </h2>
            <Warning description="Red indicators show usage > 75% of monthly token limit." />
          </div>
          <Card className="px-0 py-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status/Model</TableHead>
                  <TableHead>Token Usage (Monthly)</TableHead>
                  <TableHead><div className="pr-2 ml-auto">Manage</div></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spacesWithAgents.map((space) => (
                  <>
                    <TableRow className="bg-blue-100 h-15" key={space.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 h-full">
                          <Home size={18} />
                          {space.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge reduced disabled>
                          Space
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {space._count.agents} Agents
                      </TableCell>
                      <TableCell>
                        <TokenProgressBar limit={10000} used={1234} />
                      </TableCell>
                      <TableCell>
                        <MoreVertical className="ml-auto mr-2" size={18} />
                      </TableCell>
                    </TableRow>
                    {space?.allowedAgents?.length > 0 &&
                      space.allowedAgents.map((agent) => (
                        <TableRow key={agent.id} className="h-15">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User size={14} />
                              {agent.id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="green" reduced disabled>
                              Agent
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Bubble isActive={agent.isActive} />{" "}
                              {agent?.modelSettings?.model || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <TokenProgressBar limit={10000} used={7599} />
                          </TableCell>
                          <TableCell>
                            <MoreVertical className="ml-auto mr-2" size={18} />
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default CostControl;
