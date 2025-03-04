export type LicenseConfig = {
  valid: boolean;
  licenseKey: string;
  lastChecked: Date;
  expires: Date | undefined;
};

export type LicenseRequestMeta = {
  originURL: string;
  userCount: number;
  agentCount: number;
  documentsCount: number;
};
