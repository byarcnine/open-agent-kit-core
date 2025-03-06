import { embedMany, type Embedding } from "ai";
import { createChunks } from "./createChunks.server";
import { prisma } from "@db/db.server";
import cuid from "cuid";
import { getConfig } from "../config/config";
import { getEmbeddingModel } from "../llm/modelManager";
import path from "path";
type EmbeddingResult = {
  embedding: Embedding;
  chunk: string;
};

const sanitizeText = (text: string) => {
  // Remove null characters and other problematic Unicode
  return text.replace(/\u0000/g, "").replace(/[\uFFFD\uFFFE\uFFFF]/g, "");
};

export const embedText = async (
  text: string,
  agentId: string
): Promise<EmbeddingResult[]> => {
  const config = getConfig();
  const embeddingModel = await getEmbeddingModel(config, agentId);
  const chunks = await createChunks(text);

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });
  return embeddings.map((embedding, index) => ({
    embedding,
    chunk: chunks[index],
  }));
};

export const embeddingsToDatabase = async (
  embeddings: EmbeddingResult[],
  documentId: string
) => {
  await prisma.$transaction(
    embeddings.map(
      (embedding) =>
        prisma.$executeRaw`
            INSERT INTO "embedding" (
              "id",
              "content",
              "knowledgeDocumentId",
              "vector",
              "dimensions",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${cuid()},
              ${sanitizeText(embedding.chunk)},
              ${documentId},
              ${JSON.stringify(embedding.embedding)}::vector,
              ${embedding.embedding.length},
              NOW(),
              NOW()
            )
          `
    )
  );
};

export const createKnowledgeDocumentFromText = async (
  text: string,
  agentId: string,
  name: string,
  provider: string = "default"
) => {
  const embeddings = await embedText(text, agentId);
  if (embeddings.length === 0) {
    throw new Error(
      "Could not embed text - perhaps the document doesn't contain any text? (Note: OCR documents are not supported yet)"
    );
  }
  const filename = path.parse(name).name;
  const extension = path.parse(name).ext;
  let nameToUse = name;
  const existingDocumentCount = await prisma.knowledgeDocument.count({
    where: {
      agentId: agentId,
      name: {
        startsWith: filename,
      },
    },
  });

  if (existingDocumentCount > 0) {
    nameToUse = `${filename}-${existingDocumentCount + 1}${extension}`;
  }

  const document = await prisma.knowledgeDocument.create({
    data: {
      id: cuid(),
      agentId: agentId,
      name: nameToUse,
      provider: provider,
      status: "EMBEDDING",
    },
  });
  await embeddingsToDatabase(embeddings, document.id);
  await prisma.knowledgeDocument.update({
    where: { id: document.id },
    data: { status: "COMPLETED" },
  });
};
