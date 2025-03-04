import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { prisma } from "@db/db.server";
import type { OAKConfig } from "~/types/config";
import type { ModelSettings } from "~/types/llm";

export const getAvailableModels = (config: OAKConfig) => {
  const availableModels: string[] = [];
  if (process.env.OPENAI_API_KEY) {
    availableModels.push("openai.chat");
  }
  if (process.env.ANTHROPIC_API_KEY) {
    availableModels.push("anthropic.messages");
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    availableModels.push("google.generative-ai");
  }
  if (process.env.XAI_API_KEY) {
    availableModels.push("xai.chat");
  }

  return (
    config.models.filter((model) => availableModels.includes(model.provider)) ||
    config.models
  ).map((model) => model.modelId);
};

const getDefaultModel = (config: OAKConfig) => {
  return (
    config.models.find(
      (model) => model.modelId === getAvailableModels(config)[0]
    ) || config.models[0]
  );
};

export const setModelForAgent = async (agentId: string, modelId: string) => {
  await prisma.agent.update({
    where: { id: agentId },
    data: { modelSettings: { model: modelId } },
  });
};

export const getModelForAgent = async (agentId: string, config: OAKConfig) => {
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
  });

  if (!agent) {
    return getDefaultModel(config);
  }

  if (
    agent.modelSettings &&
    typeof agent.modelSettings === "object" &&
    "model" in agent.modelSettings
  ) {
    const modelId = (agent.modelSettings as ModelSettings).model;
    if (getAvailableModels(config).includes(modelId)) {
      return (
        config.models.find((model) => model.modelId === modelId) ||
        getDefaultModel(config)
      );
    }
  }

  return getDefaultModel(config);
};

export const getDefaultEmbeddingModel = async (
  config: OAKConfig,
  agentId: string
) => {
  const agentModel = await getModelForAgent(agentId, config);
  switch (agentModel.provider) {
    case "xai.chat": // xai doesnt have an embedding model as of march 3, 2025
    case "openai.chat":
      return openai.embedding("text-embedding-3-small");
    case "anthropic.messages":
      return anthropic.textEmbeddingModel("voyage-3");
    case "google.generative-ai":
      return google.textEmbeddingModel("text-embedding-004");
    default:
      return openai.embedding("text-embedding-3-small");
  }
};

export const getEmbeddingModel = async (config: OAKConfig, agentId: string) => {
  const agentModel =
    config.embedding?.model ||
    (await getDefaultEmbeddingModel(config, agentId));
  return agentModel;
};
