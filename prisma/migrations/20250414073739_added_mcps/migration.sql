-- CreateEnum
CREATE TYPE "MCPType" AS ENUM ('SSE', 'STDIO');

-- CreateTable
CREATE TABLE "mcp" (
    "id" TEXT NOT NULL,
    "type" "MCPType" NOT NULL,
    "agentId" TEXT NOT NULL,
    "connectionArgs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcp_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "mcp" ADD CONSTRAINT "mcp_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
