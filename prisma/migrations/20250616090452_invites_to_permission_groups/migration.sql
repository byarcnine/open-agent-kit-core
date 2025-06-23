/*
  Warnings:

  - You are about to drop the column `agentId` on the `invitation` table. All the data in the column will be lost.
  - You are about to drop the column `agentRole` on the `invitation` table. All the data in the column will be lost.
  - You are about to drop the column `globalRole` on the `invitation` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `invitation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email,permissionGroupId]` on the table `invitation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `permissionGroupId` to the `invitation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "invitation" DROP CONSTRAINT "invitation_agentId_fkey";

-- DropIndex
DROP INDEX "invitation_email_agentId_key";

-- AlterTable
ALTER TABLE "invitation" DROP COLUMN "agentId",
DROP COLUMN "agentRole",
DROP COLUMN "globalRole",
DROP COLUMN "type",
ADD COLUMN     "permissionGroupId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "invitation_email_permissionGroupId_key" ON "invitation"("email", "permissionGroupId");

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "permission_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
