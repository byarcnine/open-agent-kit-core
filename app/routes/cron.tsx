import { processEmbeddings } from "~/lib/jobs/embedDocument.server";
import {
  createUpdateKnowledgeSourcesJobs,
  processUpdateKnowledgeSources,
} from "~/lib/jobs/updateKnowledegeSources.server";

export const action = async () => {
  const currentTimeMinutes = new Date().getMinutes();
  // TODO: Improve this to be more accurate and flexible
  if (currentTimeMinutes % 12 === 0) {
    await createUpdateKnowledgeSourcesJobs();
    // Wait for the jobs to be created
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  }
  await Promise.all([processEmbeddings(), processUpdateKnowledgeSources()]);
  return { success: true };
};
