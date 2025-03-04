import type { VectorSearchResult } from "~/lib/knowledge/vectorSearch.server";
import "./knowledgeTool.scss";

const KnowledgeTool = ({ result }: { result: VectorSearchResult }) => {
  const documents = Array.from(
    new Set(result?.map((r) => r.knowledgeDocumentName) || [])
  );
  return (
    <div className="knowledge-tool">
      <div className="knowledge-tool__documents">
        <ul>
          {documents.map((document) => (
            <li key={document}>{document}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default KnowledgeTool;
