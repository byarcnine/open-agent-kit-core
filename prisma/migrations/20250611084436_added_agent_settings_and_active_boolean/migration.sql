-- AlterTable
ALTER TABLE "agent" ADD COLUMN     "agentSettings" JSONB,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "usage" ALTER COLUMN "inputTokens" SET DEFAULT 0;
