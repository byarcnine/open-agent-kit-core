/*
  Warnings:

  - A unique constraint covering the columns `[scope,referenceId,permissionGroupId]` on the table `permission` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "permission_scope_referenceId_key";

-- CreateIndex
CREATE UNIQUE INDEX "permission_scope_referenceId_permissionGroupId_key" ON "permission"("scope", "referenceId", "permissionGroupId");
