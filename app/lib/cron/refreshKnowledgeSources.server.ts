import { prisma } from "@db/db.server";
import { embedDocumentQueue } from "~/lib/jobs/embedDocument.server";
import { getPlugins } from "~/lib/plugins/plugins.server";

export const refreshKnowledgeSources = async (
  agentId: string,
  pluginName: string
) => {
  const existingDocuments = await prisma.knowledgeDocument.findMany({
    where: {
      agentId,
      provider: pluginName,
      status: {
        in: ["EMBEDDING", "COMPLETED"],
      },
    },
  });

  const plugin = getPlugins().find((p) => p.name === pluginName);
  if (!plugin) {
    throw new Error(`Plugin ${pluginName} not found`);
  }
  console.log("plugin", plugin);
  if (!plugin.syncKnowledge || typeof plugin.syncKnowledge !== "function") {
    // This plugin does not have a syncKnowledge function implemented
    console.log(
      `Plugin ${pluginName} does not have a syncKnowledge function implemented`
    );
    return true;
  }
  try {
    const syncJobs = await plugin.syncKnowledge({
      agentId,
      existingDocuments,
    });
    console.log("syncJobs", syncJobs);
    for (const syncJob of syncJobs) {
      if (syncJob.action === "ADD") {
        let upsertDocumentId: string | undefined = undefined;
        if (
          syncJob.id &&
          existingDocuments.find((doc) => doc.id === syncJob.id)
        ) {
          // update the document
          upsertDocumentId = syncJob.id;
        } else {
          const newDocument = await prisma.knowledgeDocument.create({
            data: {
              agentId,
              provider: pluginName,
              name: syncJob.name,
              status: "PENDING",
            },
          });
          upsertDocumentId = newDocument.id;
        }
        embedDocumentQueue.enqueue({
          agentId,
          content: syncJob.text,
          source: pluginName,
          documentId: upsertDocumentId,
        });
      } else if (syncJob.action === "DELETE") {
        // remove the document from the DB
        await prisma.knowledgeDocument.delete({
          where: {
            id: syncJob.id,
            provider: pluginName,
          },
        });
      }
    }
  } catch (error) {
    console.error(
      `Error refreshing knowledge sources for plugin ${pluginName}`,
      error
    );
    return false;
  }
};
