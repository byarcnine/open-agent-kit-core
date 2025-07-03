/*
  Warnings:

  - A unique constraint covering the columns `[name,level,spaceId,agentId]` on the table `permission_group` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PermissionGroupLevel" AS ENUM ('GLOBAL', 'SPACE', 'AGENT');

-- AlterTable
ALTER TABLE "permission_group" ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "level" "PermissionGroupLevel" NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN     "spaceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "permission_group_name_level_spaceId_agentId_key" ON "permission_group"("name", "level", "spaceId", "agentId");

-- AddForeignKey
ALTER TABLE "permission_group" ADD CONSTRAINT "permission_group_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_group" ADD CONSTRAINT "permission_group_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
