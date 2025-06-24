-- AlterTable
ALTER TABLE "plugin_availability" ADD COLUMN     "spaceId" TEXT;

-- AddForeignKey
ALTER TABLE "plugin_availability" ADD CONSTRAINT "plugin_availability_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "space"("id") ON DELETE CASCADE ON UPDATE CASCADE;
