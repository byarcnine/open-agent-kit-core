/*
  Warnings:

  - Added the required column `color` to the `knowledge_document_tag` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `knowledge_document_tag` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `knowledge_document_tag` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "knowledge_document_tag" ADD COLUMN     "color" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
