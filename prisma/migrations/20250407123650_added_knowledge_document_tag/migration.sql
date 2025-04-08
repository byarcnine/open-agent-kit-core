-- CreateTable
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_document_tag" (
    "id" TEXT NOT NULL,
    "knowledgeDocumentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "knowledge_document_tag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tag_name_key" ON "tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_document_tag_knowledgeDocumentId_tagId_key" ON "knowledge_document_tag"("knowledgeDocumentId", "tagId");

-- AddForeignKey
ALTER TABLE "knowledge_document_tag" ADD CONSTRAINT "knowledge_document_tag_knowledgeDocumentId_fkey" FOREIGN KEY ("knowledgeDocumentId") REFERENCES "knowledge_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_document_tag" ADD CONSTRAINT "knowledge_document_tag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
