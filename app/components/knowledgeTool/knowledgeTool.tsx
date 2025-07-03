import type { VectorSearchResult } from "../../lib/knowledge/vectorSearch.server";
import "./knowledgeTool.scss";

const KnowledgeTool = ({ result }: { result: VectorSearchResult }) => {
  const documents = Array.from(
    new Set(result?.map((r) => r.knowledgeDocumentName) || []),
  );
  return (
    <div className="knowledge-tool">
      <div className="knowledge-tool__documents">
        {documents.length > 0 && (
          <ul>
            {documents.map((document) => (
              <li key={document}>{document}</li>
            ))}
          </ul>
        )}
        {documents.length === 0 && <p>No relevant documents found</p>}
      </div>
    </div>
  );
};

export default KnowledgeTool;
