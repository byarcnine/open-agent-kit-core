/*
  Warnings:

  - Made the column `spaceId` on table `agent` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "agent" DROP CONSTRAINT "agent_spaceId_fkey";

-- AlterTable
ALTER TABLE "agent" ALTER COLUMN "spaceId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "agent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
