import { createQueue } from "@mgcrea/prisma-queue";
import { refreshKnowledgeSources } from "../cron/refreshKnowledgeSources.server";
import { prisma } from "@db/db.server";
import { getPluginsForAgent } from "~/lib/plugins/availability.server";

type JobPayload = {
  agentId: string;
  plugin: string;
};

type JobResult = {
  success: boolean;
};

export const updateKnowledgeSourcesQueue = createQueue<JobPayload, JobResult>(
  {
    name: "UpdateKnowledgeSourcesQueue",
    maxAttempts: 3,
    deleteOn: "success",
    alignTimeZone: false,
    pollInterval: 200,
    maxConcurrency: 1,
  },
  async (job) => {
    const { agentId, plugin } = job.payload;
    console.log("updateKnowledgeSourcesQueue - job started", agentId, plugin);
    await Promise.race([
      refreshKnowledgeSources(agentId, plugin),
      new Promise((resolve) => setTimeout(resolve, 30000)),
    ]);
    console.log("updateKnowledgeSourcesQueue - job finished", agentId, plugin);
    return { success: true };
  },
);

export const createUpdateKnowledgeSourcesJobs = async (
  agentId?: string,
  pluginName?: string,
) => {
  const agents = await prisma.agent.findMany();
  for (const agent of agents) {
    const plugins = await getPluginsForAgent(agent.id);
    for (const plugin of plugins) {
      if (agentId && agentId !== agent.id) {
        continue;
      }
      if (pluginName && pluginName !== plugin.name) {
        continue;
      }
      if (!plugin.syncKnowledge || typeof plugin.syncKnowledge !== "function") {
        continue;
      }
      console.log(
        "Enqueuing job for agent",
        agent.id,
        "and plugin",
        plugin.name,
      );
      updateKnowledgeSourcesQueue.enqueue({
        agentId: agent.id,
        plugin: plugin.name,
      });
    }
  }
};

export const processUpdateKnowledgeSources = async () => {
  const startSize = await updateKnowledgeSourcesQueue.size(true);
  console.log(
    "processUpdateKnowledgeSources - Starting queue with size",
    startSize,
  );
  if (startSize === 0) {
    return { success: true };
  }
  await new Promise((resolve) => {
    updateKnowledgeSourcesQueue.addListener("success", async () => {
      const queueSize = await updateKnowledgeSourcesQueue.size(true);
      if (queueSize === 0) {
        resolve(true);
      }
    });
    updateKnowledgeSourcesQueue.addListener("error", (error) => {
      console.error("processUpdateKnowledgeSources - job failed", error);
    });
    const queueCheckInterval = setInterval(async () => {
      const queueSize = await updateKnowledgeSourcesQueue.size(true);
      if (queueSize === 0) {
        clearInterval(queueCheckInterval);
        resolve(true);
      }
    }, 500);
    return updateKnowledgeSourcesQueue.start();
  });
  console.log("processUpdateKnowledgeSources - Queue is empty - stopping");
  updateKnowledgeSourcesQueue.stop();
  return { success: true };
};
