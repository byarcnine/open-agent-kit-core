import config from "@config/config";
import pkg from "../../../package.json";
import type { OAKConfig } from "~/types/config";

export const getConfig = (): OAKConfig => {
  return config;
};

export const getVersion = () => {
  return pkg.version;
};

export const APP_URL = () =>
  (process.env.APP_URL || process.env.VERCEL_URL) as string;
