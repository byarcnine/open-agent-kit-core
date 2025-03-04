import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { prisma } from "../../../prisma/db.server";

export const setPluginConfig = async (
  pluginIdentifier: string,
  agentId: string,
  config: object
) => {
  // Get encryption key from environment variable
  const ENCRYPTION_KEY = process.env.APP_SECRET;
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error(
      "APP_SECRET environment variable is required and must be 64 characters long. You can generate one with `openssl rand -hex 32`"
    );
  }

  const MAX_CONFIG_SIZE = 1024 * 1024; // 1MB
  if (JSON.stringify(config).length > MAX_CONFIG_SIZE) {
    throw new Error(
      `Config size exceeds the maximum allowed size of ${MAX_CONFIG_SIZE} bytes`
    );
  }

  // Generate a random IV
  const iv = randomBytes(16);

  // Create cipher
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    iv
  );

  // Encrypt the config
  const encryptedConfig = Buffer.concat([
    cipher.update(JSON.stringify(config), "utf8"),
    cipher.final(),
  ]);

  // Get auth tag
  const authTag = cipher.getAuthTag();

  await prisma.pluginConfig.upsert({
    where: {
      pluginIdentifier_agentId: {
        pluginIdentifier,
        agentId,
      },
    },
    update: {
      config: JSON.stringify({
        encrypted: encryptedConfig.toString("base64"),
        iv: iv.toString("base64"),
        tag: authTag.toString("base64"),
      }),
    },
    create: {
      pluginIdentifier,
      agentId,
      config: JSON.stringify({
        encrypted: encryptedConfig.toString("base64"),
        iv: iv.toString("base64"),
        tag: authTag.toString("base64"),
      }),
    },
  });
};

export const getPluginConfig = async <T>(
  pluginIdentifier: string,
  agentId: string
): Promise<T | null> => {
  // Get encryption key from environment variable
  const ENCRYPTION_KEY = process.env.APP_SECRET;
  if (!ENCRYPTION_KEY) {
    throw new Error("APP_SECRET environment variable is required");
  }

  // Fetch encrypted config from database
  const pluginConfig = await prisma.pluginConfig.findFirst({
    where: {
      pluginIdentifier,
      agentId,
    },
  });

  if (!pluginConfig) {
    return null;
  }

  // Parse the stored config
  const storedConfig = JSON.parse(pluginConfig.config);

  // Create decipher
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(ENCRYPTION_KEY, "hex"),
    Buffer.from(storedConfig.iv, "base64")
  );

  // Set auth tag
  decipher.setAuthTag(Buffer.from(storedConfig.tag, "base64"));

  // Decrypt the config
  const decryptedConfig = Buffer.concat([
    decipher.update(Buffer.from(storedConfig.encrypted, "base64")),
    decipher.final(),
  ]);

  // Parse and return the decrypted config
  return JSON.parse(decryptedConfig.toString("utf8"));
};
