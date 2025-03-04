import type { EmbeddingModel, LanguageModel, LanguageModelV1 } from "ai";

export type OAKConfig = {
  name: string;
  models: LanguageModelV1[];
  embedding?: {
    model: EmbeddingModel<string>;
    chunkSize?: number;
    overlap?: number;
  };
};
