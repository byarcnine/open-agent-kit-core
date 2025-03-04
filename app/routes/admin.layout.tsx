import { Suspense } from "react";
import {
  Await,
  Outlet,
  useLoaderData,
  type LoaderFunctionArgs,
} from "react-router";
import { getLicenseStatus } from "~/lib/license/license.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const hasValidLicense = getLicenseStatus(request).then(
    (license) => license.valid
  );
  return { hasValidLicense };
};

export default function AdminLayout() {
  const { hasValidLicense } = useLoaderData<typeof loader>();
  return (
    <>
      <Suspense>
        <Await resolve={hasValidLicense}>
          {(licenseValid) =>
            !licenseValid && (
              <div className="flex flex-col items-center justify-center bg-red-400 w-full top-0 left-0 relative h-auto py-2">
                <span className="text-white text-sm text-center">
                  No valid license found. Please{" "}
                  <a
                    className="border-b border-dotted font-medium"
                    href="/settings"
                  >
                    activate your license
                  </a>{" "}
                  .
                </span>
              </div>
            )
          }
        </Await>
      </Suspense>
      <Outlet />
    </>
  );
}
