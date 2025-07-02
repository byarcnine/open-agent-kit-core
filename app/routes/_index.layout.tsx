import { Outlet, useLoaderData, type LoaderFunctionArgs } from "react-router";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import {
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import type { SessionUser } from "~/types/auth";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(request);
  const userScopes = await getUserScopes(user);

  return {
    user: user as SessionUser,
    userScopes,
  };
};

const IndexLayout = () => {
  const { user, userScopes } = useLoaderData<typeof loader>();
  return (
    <Layout navComponent={<OverviewNav userScopes={userScopes} />} user={user}>
      <Outlet />
    </Layout>
  );
};

export default IndexLayout;
