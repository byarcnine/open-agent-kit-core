import { createQueue } from "@mgcrea/prisma-queue";
import { prisma } from "@db/db.server";
import { embeddingsToDatabase, embedText } from "../knowledge/embedding.server";

type JobPayload = {
  agentId: string;
  content: string;
  source: string;
  documentId: string;
};

type JobResult = {
  success: boolean;
};

export const embedDocumentQueue = createQueue<JobPayload, JobResult>(
  { name: "EmbedDocument" },
  async (job) => {
    console.log("embedDocumentQueue - job started", job);
    try {
      const { payload } = job;
      const { documentId } = payload;
      await prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: "EMBEDDING" },
      });
      const embeddings = await embedText(payload.content, payload.agentId);
      await embeddingsToDatabase(embeddings, documentId);
      await prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: { status: "COMPLETED" },
      });
      return {
        success: true,
      };
    } catch (error) {
      console.error("embedDocumentQueue - job failed", error);
      await prisma.knowledgeDocument.update({
        where: { id: job.payload.documentId },
        data: { status: "FAILED" },
      });
      return {
        success: false,
      };
    }
  }
);

export const processEmbeddings = async () => {
  const startSize = await embedDocumentQueue.size(true);
  console.log("processEmbeddings - Starting queue with size", startSize);
  if (startSize === 0) {
    return { success: true };
  }
  await new Promise((resolve) => {
    embedDocumentQueue.addListener("success", async () => {
      const queueSize = await embedDocumentQueue.size(true);
      if (queueSize === 0) {
        resolve(true);
      }
    });
    const queueCheckInterval = setInterval(async () => {
      const queueSize = await embedDocumentQueue.size(true);
      if (queueSize === 0) {
        clearInterval(queueCheckInterval);
        resolve(true);
      }
    }, 500);
    return embedDocumentQueue.start();
  });
  embedDocumentQueue.stop();
  return { success: true };
};
