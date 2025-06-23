import type { JsonValue } from "@prisma/client/runtime/library";

export interface SpaceWithAgents {
  _count: {
    agents: number;
  };
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  description: string | null;
  spaceId: string;
  isActive: boolean;
  modelSettings: JsonValue;
  allowedAgents: AgentWithUsage[];
  totalTokens?: number;
}

export interface Usage {
  id: string;
  inputTokens: bigint;
  outputTokens: bigint;
  modelId: string | null;
  userId: string | null;
  year: number;
  month: number;
  agentId: string;
  totalTokens?: number;
}

export interface AgentUsage {
  id: string;
  inputTokens: number;
  outputTokens: number;
  modelId: string | null;
  userId: string | null;
  year: number;
  month: number;
  agentId: string;
  totalTokens?: number;
}

export interface AgentWithUsage {
  id: string;
  name: string;
  spaceId: string;
  isActive: boolean;
  modelSettings: JsonValue;
  usage?: AgentUsage[] | undefined;
}
