export type ModelSettings = {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
};

export type Limits = {
  activeLimits: {
    entityId: string;
    type: "space" | "agent" | "user";
    limit: number;
    entity?: {
      name: string;
    };
  }[];
};
