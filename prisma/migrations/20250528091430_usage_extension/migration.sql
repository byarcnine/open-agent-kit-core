/*
  Warnings:

  - You are about to drop the column `tokens` on the `usage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[agentId,year,month,day,modelId,initiator]` on the table `usage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "usage_agentId_year_month_day_modelId_key";

-- AlterTable
ALTER TABLE "usage" RENAME COLUMN "tokens" TO "inputTokens";
ALTER TABLE "usage" ADD COLUMN "initiator" TEXT NOT NULL DEFAULT 'core';
ALTER TABLE "usage" ADD COLUMN "invocations" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "usage" ADD COLUMN "outputTokens" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "usage" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "usage_agentId_year_month_day_modelId_initiator_key" ON "usage"("agentId", "year", "month", "day", "modelId", "initiator");

-- AddForeignKey
ALTER TABLE "usage" ADD CONSTRAINT "usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
