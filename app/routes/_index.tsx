import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useLoaderData,
  Link,
  useActionData,
} from "react-router";
import { prisma } from "@db/db.server";
import { CardHeader, CardTitle } from "~/components/ui/card";
import {
  allowedSpacesToViewForUser,
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import { Package, Search } from "react-feather";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { z } from "zod";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import { type SessionUser } from "~/types/auth";
import NoDataCard from "~/components/ui/no-data-card";
import CreateSpaceDialog from "~/components/createSpaceDialog/createSpaceDialog";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { PERMISSION } from "~/lib/permissions/permissions";
import { AgentCard, AgentCardContent } from "~/components/ui/agent-card";
import { oakContext } from "~/lib/middleware/oakMiddleware.server";

const CreateSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required"),
  slug: z
    .string()
    .min(3, "Space slug is required and must be at least 3 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and hyphens",
    ),
  description: z.string().optional(),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  await hasAccessHierarchical(request, PERMISSION["global.edit_spaces"]);

  const formData = await request.formData();

  const validation = CreateSpaceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });

  if (!validation.success) {
    return {
      errors: validation.error.flatten().fieldErrors,
    };
  }

  const { name, slug } = validation.data;

  try {
    const space = await prisma.space.create({
      data: {
        id: slug,
        name,
        description: validation.data.description || null,
      },
    });
    return redirect(`/space/${space.id}`);
  } catch (error) {
    return {
      errors: {
        slug: ["Space with this slug already exists"],
      },
    };
  }
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(request);
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
  const userScopes = await getUserScopes(user);
  const canCreateSpace = userScopes.some(
    (scope) => scope.scope === PERMISSION["global.edit_spaces"],
  );
  return {
    spaces,
    user: user as SessionUser,
    userScopes,
    canCreateSpace,
  };
};

const Index = () => {
  const { spaces, user, userScopes, canCreateSpace } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const [search, setSearch] = useState("");
  const [agentViewType, setAgentViewType] = useState("grid");

  const handleTabChange = (value: string) => {
    sessionStorage.setItem("agentViewType", value);
    setAgentViewType(value);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };
  // Filter agents based on search input
  const filteredSpaces = search
    ? spaces.filter((space) =>
        space.name.toLowerCase().includes(search.toLowerCase()),
      )
    : spaces;

  useEffect(() => {
    const savedTab = sessionStorage.getItem("agentViewType");
    if (savedTab) {
      setAgentViewType(savedTab);
    } else {
      setAgentViewType("grid");
    }
  }, []);

  return (
    <Layout navComponent={<OverviewNav userScopes={userScopes} />} user={user}>
      <div className="w-full flex flex-col h-full overflow-hidden pt-8 px-4 md:px-8">
        <div className="sticky top-0">
          <div className="flex flex-row flex-wrap items-center justify-between pb-4 gap-4">
            <h1 className="text-3xl font-medium">My Spaces</h1>
            <CreateSpaceDialog errors={actionData?.errors} />
          </div>
          <div className="flex flex-row items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute w-4 h-4 left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                type="text"
                placeholder="Search Spaces ..."
                className="w-full max-w-md pl-8"
                value={search}
                onChange={handleSearch}
                name="search"
              />
            </div>
            <div className="flex gap-1 ml-auto">
              <Tabs
                defaultValue={agentViewType}
                value={agentViewType}
                onValueChange={handleTabChange}
                className="w-full max-w-md"
              >
                <TabsList>
                  <TabsTrigger reduced value="grid">
                    Grid
                  </TabsTrigger>
                  <TabsTrigger reduced value="list">
                    List
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <div className="border-t mt-4 mb-8" />
        </div>
        <div className="flex-1 flex flex-col pb-8 overflow-auto scrollbar-none">
          {filteredSpaces && filteredSpaces.length === 0 && canCreateSpace ? (
            <NoDataCard
              className="my-auto"
              headline={search ? "No agents found" : "No spaces created"}
              description={
                search
                  ? "Try a different search term"
                  : "Create your first space!"
              }
            >
              <CreateSpaceDialog errors={actionData?.errors} />
            </NoDataCard>
          ) : (
            <>
              {agentViewType === "grid" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  {filteredSpaces &&
                    filteredSpaces.map((space) => (
                      <AgentCard
                        key={space.id}
                        className="justify-between flex flex-col"
                      >
                        <CardHeader className="flex flex-row justify-between">
                          <div className="flex-1">
                            <CardTitle>{space.name}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-2">
                              {space.description || "No description"}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <div className="ml-2 text-sm text-muted-foreground flex items-center">
                              <Package className="h-4 w-4 inline mr-1" />
                              {space._count.agents ?? "0"}
                            </div>
                          </div>
                        </CardHeader>
                        <AgentCardContent>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              className="block flex-1"
                              to={`/space/${space.id}`}
                            >
                              <Button variant="default" className="w-full">
                                <Package className="h-4 w-4" />
                                View Space
                              </Button>
                            </Link>

                            {/* {userCanEdit(space) && (
                              <Link
                                className="flex-1"
                                to={`/space/${space.id}`}
                              >
                                <Button variant="outline" className="w-full">
                                  <Sliders className="h-4 w-4" />
                                  Manage
                                </Button>
                              </Link>
                            )} */}
                          </div>
                        </AgentCardContent>
                      </AgentCard>
                    ))}
                </div>
              )}
              {agentViewType === "list" &&
              filteredSpaces &&
              filteredSpaces.length > 0 ? (
                <div className="">
                  <div className="border shadow-xs rounded-xl overflow-hidden">
                    <Table className="w-full bg-white">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent Name</TableHead>
                          <TableHead className="max-md:hidden">
                            Description
                          </TableHead>
                          <TableHead className="w-40">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSpaces.map((space) => (
                          <TableRow className="cursor-pointer" key={space.id}>
                            <TableCell>{space.name}</TableCell>
                            <TableCell className="max-md:hidden">
                              {space.description || "No description"}
                            </TableCell>

                            <TableCell>
                              <Link to={`/space/${space.id}`}>
                                <Button variant="default" size="sm">
                                  View Space
                                </Button>
                              </Link>
                              {/* {userCanEdit(space) && (
                                <Link to={`/space/${space.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-2"
                                  >
                                    Manage
                                  </Button>
                                </Link>
                              )} */}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Index;

export const meta: MetaFunction<typeof loader> = () => {
  return [
    { title: `OAK Dashboard` },
    { name: "description", content: "Open Agent Kit Dashboard" },
  ];
};
