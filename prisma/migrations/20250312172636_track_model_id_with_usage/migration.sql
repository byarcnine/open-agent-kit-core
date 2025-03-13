/*
  Warnings:

  - A unique constraint covering the columns `[agentId,year,month,day,modelId]` on the table `usage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "usage_agentId_year_month_day_key";

-- AlterTable
ALTER TABLE "usage" ADD COLUMN     "modelId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "usage_agentId_year_month_day_modelId_key" ON "usage"("agentId", "year", "month", "day", "modelId");
