import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
} from "react-router";
import Layout from "~/components/layout/layout";
import { OverviewNav } from "~/components/overviewNav/overviewNav";
import { Button } from "~/components/ui/button";
import { useEffect } from "react";
import { toast, Toaster } from "sonner";
import {
  getLicenseFromSettings,
  getUsageStats,
  MAX_AGENTS,
  MAX_DOCUMENTS,
  MAX_USERS,
  needsLicense,
  setLicense,
} from "~/lib/license/license.server";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { getVersion } from "~/lib/config/config";
import { cn } from "~/lib/utils";
import {
  getUserScopes,
  hasAccessHierarchical,
} from "~/lib/permissions/enhancedHasAccess.server";
import { PERMISSION } from "~/lib/permissions/permissions";
import type { SessionUser } from "~/types/auth";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await hasAccessHierarchical(
    request,
    PERMISSION["global.super_admin"],
  );
  const licensePromise = getLicenseFromSettings();
  const usageStatsPromise = getUsageStats();
  const [license, usageStats, licenseNeeded] = await Promise.all([
    licensePromise,
    usageStatsPromise,
    needsLicense(),
  ]);
  const version = getVersion();
  const userScopes = await getUserScopes(user);

  return {
    user: user as SessionUser,
    license,
    version,
    usageStats,
    MAX_USERS,
    MAX_AGENTS,
    MAX_DOCUMENTS,
    licenseNeeded,
    userScopes,
  };
};

type ActionData = {
  success: boolean;
  error?: string;
  message?: string;
  intent: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  await hasAccessHierarchical(request, PERMISSION["global.super_admin"]);
  const intent = formData.get("intent");

  switch (intent) {
    case "addLicense": {
      const license = formData.get("license");
      try {
        await setLicense(license as string);
        return data<ActionData>(
          { success: true, intent, message: "License added successfully" },
          { status: 200 },
        );
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        console.error(errorMessage);
        return data<ActionData>(
          { success: false, intent, error: errorMessage },
          { status: 400 },
        );
      }
    }
  }
};

const Settings = () => {
  const {
    user,
    license,
    version,
    usageStats,
    MAX_AGENTS,
    MAX_DOCUMENTS,
    MAX_USERS,
    licenseNeeded,
    userScopes,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const roleFetcher = useFetcher<{ success: boolean; message?: string }>();

  useEffect(() => {
    if (roleFetcher.data) {
      toast.success(roleFetcher.data.message);
    }
  }, [roleFetcher.data]);

  useEffect(() => {
    if (actionData && actionData.intent === "invite") {
      toast.success(actionData.message);
    }
    if (actionData && actionData.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);


  return (
    <Layout navComponent={<OverviewNav userScopes={userScopes} />} user={user}>
      <div className="w-full py-8 px-4 md:p-8 flex flex-col">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-medium">Global Settings</h1>
            <p className="text-muted-foreground text-sm">Version {version}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="rounded border p-4">
            <div className="flex items-center flex-wrap gap-2 mb-4">
              <h2 className="text-lg font-medium">Manage License</h2>
              <div className="flex gap-2">
                {license.valid && (
                  <Badge disabled className="bg-green-600 block">
                    Valid
                  </Badge>
                )}
                {!license.valid && licenseNeeded && (
                  <Badge disabled className="bg-destructive">
                    Invalid
                  </Badge>
                )}
              </div>
            </div>
            <Form method="post" className="flex gap-4 items-end">
              <div className="flex-1 flex flex-wrap gap-2 items-end">
                <div>
                  <label
                    htmlFor="license"
                    className="block text-sm font-medium mb-2"
                  >
                    License Key
                  </label>
                  <div className="text-sm text-muted-foreground mb-2">
                    Enter your license key to activate the license. If you don't
                    have a license key, please purchase one at{" "}
                    <a
                      href="https://open-agent-kit.com"
                      target="_blank"
                      className="underline hover:no-underline"
                      rel="noopener noreferrer"
                    >
                      open-agent-kit.com
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      id="license"
                      defaultValue={license.licenseKey}
                      name="license"
                      placeholder="License"
                      required
                      className="max-w-xs"
                    />
                    <input type="hidden" name="intent" value="addLicense" />
                    <Button type="submit">Activate License</Button>
                  </div>
                </div>
              </div>
            </Form>
            <div className="gap-2 float-left pt-4">
              <div className="flex flex-col gap-2">
                <Badge
                  disabled
                  className={cn("block", {
                    "bg-green-600":
                      usageStats.userCount <= MAX_USERS || license.valid,
                    "bg-red-400":
                      usageStats.userCount > MAX_USERS && !license.valid,
                  })}
                >
                  User: {usageStats.userCount} /{" "}
                  {license.valid ? "∞" : MAX_USERS}
                </Badge>
                <Badge
                  disabled
                  className={cn("block", {
                    "bg-green-600":
                      usageStats.agentCount <= MAX_AGENTS || license.valid,
                    "bg-red-400":
                      usageStats.agentCount > MAX_AGENTS && !license.valid,
                  })}
                >
                  Agents: {usageStats.agentCount} /{" "}
                  {license.valid ? "∞" : MAX_AGENTS}
                </Badge>
                <Badge
                  disabled
                  className={cn("block", {
                    "bg-green-600":
                      usageStats.documentsCount <= MAX_DOCUMENTS ||
                      license.valid,
                    "bg-red-400":
                      usageStats.documentsCount > MAX_DOCUMENTS &&
                      !license.valid,
                  })}
                >
                  Documents: {usageStats.documentsCount} /{" "}
                  {license.valid ? "∞" : MAX_DOCUMENTS}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </Layout>
  );
};

export default Settings;
