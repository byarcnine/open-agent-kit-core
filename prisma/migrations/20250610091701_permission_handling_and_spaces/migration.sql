-- AlterTable
ALTER TABLE "agent" ADD COLUMN     "spaceId" TEXT;

-- AlterTable
ALTER TABLE "usage" ALTER COLUMN "inputTokens" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionGroupId" TEXT,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permission_group" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_permission_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permission_scope_referenceId_userId_key" ON "permission"("scope", "referenceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_permission_group_userId_permissionGroupId_key" ON "user_permission_group"("userId", "permissionGroupId");

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "agent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission" ADD CONSTRAINT "permission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission" ADD CONSTRAINT "permission_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "permission_group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_group" ADD CONSTRAINT "user_permission_group_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_group" ADD CONSTRAINT "user_permission_group_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "permission_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
