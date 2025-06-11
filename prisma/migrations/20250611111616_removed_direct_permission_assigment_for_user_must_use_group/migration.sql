/*
  Warnings:

  - A unique constraint covering the columns `[scope,referenceId]` on the table `permission` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "permission" DROP CONSTRAINT "permission_userId_fkey";

-- DropIndex
DROP INDEX "permission_scope_referenceId_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "permission_scope_referenceId_key" ON "permission"("scope", "referenceId");

-- AddForeignKey
ALTER TABLE "permission" ADD CONSTRAINT "permission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
