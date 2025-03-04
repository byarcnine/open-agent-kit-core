import { prisma } from "@db/db.server";
import type { LicenseConfig, LicenseRequestMeta } from "~/types/license";

export const MAX_USERS = 10;
export const MAX_AGENTS = 5;
export const MAX_DOCUMENTS = 100;

export const getUsageStats = async () => {
  const userCountPromise = prisma.user.count();
  const agentCountPromise = prisma.agent.count();
  const documentsCountPromise = prisma.knowledgeDocument.count();
  const [userCount, agentCount, documentsCount] = await Promise.all([
    userCountPromise,
    agentCountPromise,
    documentsCountPromise,
  ]);
  return {
    userCount,
    agentCount,
    documentsCount,
  };
};

export const needsLicense = async () => {
  const { userCount, agentCount, documentsCount } = await getUsageStats();
  return (
    userCount > MAX_USERS ||
    agentCount > MAX_AGENTS ||
    documentsCount > MAX_DOCUMENTS
  );
};

export const checkLicenseStatusServer = async (
  licenseKey: string,
  meta?: LicenseRequestMeta
): Promise<{ valid: boolean; expires: Date | undefined }> => {
  const response = await fetch("https://api.open-agent-kit.com/license", {
    method: "POST",
    body: JSON.stringify({ licenseKey, meta }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    return {
      valid: false,
      expires: undefined,
    };
  }
  const data = await response.json();
  return {
    valid: data.valid,
    expires: data.expires,
  };
};

const reportUsageStats = async (meta: LicenseRequestMeta) => {
  const lastUsageReport = await prisma.globalConfig.findUnique({
    where: { key: "LAST_USAGE_REPORT" },
  });
  if (lastUsageReport) {
    const lastUsageReportDate = new Date(lastUsageReport.value as string);
    const now = new Date();
    const diff = now.getTime() - lastUsageReportDate.getTime();
    if (diff < 1000 * 60 * 60) {
      return;
    }
  } else {
    await prisma.globalConfig.create({
      data: { key: "LAST_USAGE_REPORT", value: new Date().toISOString() },
    });
  }
  await fetch("https://api.open-agent-kit.com/usage", {
    method: "POST",
    body: JSON.stringify({ meta }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  await prisma.globalConfig.update({
    where: { key: "LAST_USAGE_REPORT" },
    data: { value: new Date().toISOString() },
  });
};

const getMetaFromRequest = async (
  request: Request
): Promise<LicenseRequestMeta> => {
  const { userCount, agentCount, documentsCount } = await getUsageStats();

  const originURL =
    request.headers.get("origin") || request.headers.get("referer");

  const originDomain = originURL ? new URL(originURL).hostname : "";
  const meta = {
    originURL: originDomain,
    userCount,
    agentCount,
    documentsCount,
  } satisfies LicenseRequestMeta;
  return meta;
};

export const getLicenseStatus = async (request: Request) => {
  const [licenseNeeded, meta] = await Promise.all([
    needsLicense(),
    getMetaFromRequest(request),
  ]);

  if (!licenseNeeded) {
    try {
      await reportUsageStats(meta);
    } catch (error) {
      console.error("Error reporting usage stats", error);
    }
    return {
      valid: true,
      expires: undefined,
    };
  }

  const license = await prisma.globalConfig.findUnique({
    where: { key: "license" },
  });

  // the user doesn't have a license set
  if (!license) {
    return {
      valid: false,
      expires: undefined,
    };
  }
  const licenseConfig = license.value as unknown as LicenseConfig;
  if (!licenseConfig.valid || !licenseConfig.licenseKey) {
    return {
      valid: false,
      expires: undefined,
    };
  }
  const checkEvery = 1000 * 60 * 60 * 24; // 24 hours
  if (
    licenseConfig.valid &&
    new Date(Date.now()).getTime() -
      new Date(licenseConfig.lastChecked).getTime() <
      checkEvery
  ) {
    return {
      valid: true,
      expires: licenseConfig.expires,
    };
  } else {
    // recheck with the server
    const isServerValid = await checkLicenseStatusServer(
      licenseConfig.licenseKey,
      meta
    );
    if (isServerValid.valid) {
      await prisma.globalConfig.update({
        where: { key: "license" },
        data: {
          value: { ...licenseConfig, lastChecked: new Date() },
        },
      });
      return {
        valid: true,
        expires: licenseConfig.expires,
      };
    } else {
      return {
        valid: false,
        expires: undefined,
      };
    }
  }
};

export const setLicense = async (licenseKey: string) => {
  const isServerValid = await checkLicenseStatusServer(licenseKey);

  await prisma.globalConfig.upsert({
    where: { key: "license" },
    update: {
      value: {
        licenseKey,
        valid: isServerValid.valid,
        lastChecked: new Date(),
        expires: isServerValid.expires,
      } satisfies LicenseConfig,
    },
    create: {
      key: "license",
      value: {
        licenseKey,
        valid: isServerValid.valid,
        lastChecked: new Date(),
        expires: isServerValid.expires,
      } satisfies LicenseConfig,
    },
  });
  if (!isServerValid.valid) {
    throw new Error("Invalid license key");
  }
};

export const getLicenseFromSettings = async () => {
  const license = await prisma.globalConfig.findUnique({
    where: { key: "license" },
  });
  if (license && license.value) {
    return license.value as unknown as LicenseConfig;
  }
  return {
    valid: false,
    licenseKey: "",
    expires: undefined,
  };
};
