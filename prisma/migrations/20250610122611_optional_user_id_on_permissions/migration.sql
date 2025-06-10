-- AlterTable
ALTER TABLE "permission" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "GlobalUserRole" NOT NULL DEFAULT 'VIEW_EDIT_ASSIGNED_AGENTS';
