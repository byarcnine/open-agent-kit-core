/*
  Warnings:

  - You are about to drop the column `knowledgeDocumentId` on the `knowledge_document_tag` table. All the data in the column will be lost.
  - You are about to drop the column `tagId` on the `knowledge_document_tag` table. All the data in the column will be lost.
  - You are about to drop the `tag` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[agentId,name]` on the table `knowledge_document_tag` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `agentId` to the `knowledge_document_tag` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "knowledge_document_tag" DROP CONSTRAINT "knowledge_document_tag_knowledgeDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "knowledge_document_tag" DROP CONSTRAINT "knowledge_document_tag_tagId_fkey";

-- DropIndex
DROP INDEX "knowledge_document_tag_knowledgeDocumentId_tagId_key";

-- AlterTable
ALTER TABLE "knowledge_document_tag" DROP COLUMN "knowledgeDocumentId",
DROP COLUMN "tagId",
ADD COLUMN     "agentId" TEXT NOT NULL;

-- DropTable
DROP TABLE "tag";

-- CreateTable
CREATE TABLE "_KnowledgeDocumentToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_KnowledgeDocumentToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_KnowledgeDocumentToTag_B_index" ON "_KnowledgeDocumentToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_document_tag_agentId_name_key" ON "knowledge_document_tag"("agentId", "name");

-- AddForeignKey
ALTER TABLE "knowledge_document_tag" ADD CONSTRAINT "knowledge_document_tag_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KnowledgeDocumentToTag" ADD CONSTRAINT "_KnowledgeDocumentToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "knowledge_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_KnowledgeDocumentToTag" ADD CONSTRAINT "_KnowledgeDocumentToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "knowledge_document_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
