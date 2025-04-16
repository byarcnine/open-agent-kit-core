import { embedMany } from "ai";
import { Prisma, prisma } from "@db/db.server";
import { getConfig } from "../config/config";
import { getEmbeddingModel } from "../llm/modelManager.server";

const vectorSearch = async (
  query: string,
  agentId: string,
  tags: string[] = [],
  limit: number = 5,
) => {
  const config = getConfig();
  const embeddingModel = await getEmbeddingModel(config, agentId);
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: [query],
  });
  const vector = embeddings[0];
  const dimensions = vector.length;
  // Cast vector fields to text for Prisma handling

  const results: {
    id: string;
    content: string;
    knowledgeDocumentId: string;
    knowledgeDocumentName: string;
    tags: string[];
    similarity: number;
  }[] = await prisma.$queryRaw`
    SELECT
      e.id,
      e.content,
      e."knowledgeDocumentId",
      k."name" as "knowledgeDocumentName",
      k."metadata" as "metadata",
      COALESCE(ARRAY_AGG(kt.name), ARRAY[]::text[]) AS tags,
      (e.vector <-> ${vector}::vector) as similarity
    FROM "embedding" e
    JOIN "knowledge_document" k ON e."knowledgeDocumentId" = k.id
    LEFT JOIN "_KnowledgeDocumentToTag" kdt ON k.id = kdt."A"
    LEFT JOIN "knowledge_document_tag" kt ON kdt."B" = kt.id
    WHERE k."agentId" = ${agentId} AND e."dimensions" = ${dimensions}
    ${tags.length > 0 ? Prisma.sql`AND kt.name IN (${Prisma.join(tags)})` : Prisma.empty}
    GROUP BY e.id, k.id
    ORDER BY similarity ASC
    LIMIT ${limit};
  `;

  return results;
};

export default vectorSearch;

export type VectorSearchResult = Awaited<ReturnType<typeof vectorSearch>>;
