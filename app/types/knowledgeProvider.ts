import type { KnowledgeDocument } from "@prisma/client";
import type { ActionFunction, LoaderFunction } from "react-router";
import type { FC } from "react";

export type SyncKnowledgeFunctionReturnParams = (
  | {
      id?: string;
      name: string;
      action: "ADD";
      text: string;
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
};

export type KnowledgeProviderServerConfig = {
  syncKnowledge: (
    params: SyncKnowledgeFunctionParams
  ) => Promise<SyncKnowledgeFunctionReturnParams>;
  identifier: string;
  loader: LoaderFunction;
  action: ActionFunction;
}[];
