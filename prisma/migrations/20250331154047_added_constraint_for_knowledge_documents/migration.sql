/*
  Warnings:

  - A unique constraint covering the columns `[agentId,name,provider]` on the table `knowledge_document` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "knowledge_document_agentId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_document_agentId_name_provider_key" ON "knowledge_document"("agentId", "name", "provider");
