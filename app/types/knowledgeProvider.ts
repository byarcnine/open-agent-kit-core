import type { KnowledgeDocument } from "@prisma/client";
import type { ActionFunction, LoaderFunction } from "react-router";
import type { FC } from "react";
import type OAKProvider from "~/lib/lib";

export type SyncKnowledgeFunctionReturnParams = (
  | {
      id?: string;
      name: string;
      action: "ADD";
      text: string;
      metadata?: Record<string, any>;
    }
  | {
      id: string;
      name: string;
      action: "DELETE";
      text?: string;
    }
)[];

export type KnowledgeProviderClientConfig = {
  identifier: string;
  name: string;
  page: FC;
  description: string;
};

export type SyncKnowledgeFunctionParams = {
  agentId: string;
  existingDocuments: KnowledgeDocument[];
  provider: ReturnType<typeof OAKProvider>;
};

export type KnowledgeProviderServerConfig = {
  syncKnowledge: (
    params: SyncKnowledgeFunctionParams,
  ) => Promise<SyncKnowledgeFunctionReturnParams>;
  identifier: string;
  loader: LoaderFunction;
  action: ActionFunction;
}[];
