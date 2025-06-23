-- DropForeignKey
ALTER TABLE "agent" DROP CONSTRAINT "agent_spaceId_fkey";

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "agent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
