export type KbVectorStore = "qdrant" | "pinecone" | "pgvector";

export type KbEmbeddingModel =
  | "text-embedding-3-small"
  | "text-embedding-3-large";

export interface KnowledgeBase {
  id: string; // kb_xxx
  name: string;
  description?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  vectorStore: KbVectorStore;
  embeddingModel: KbEmbeddingModel;
  chunkSize: number;
  chunkOverlap: number;
}

export interface KbDocument {
  id: string; // doc_xxx
  kbId: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  status: "uploaded" | "indexed" | "failed";
  createdAt: string; // ISO
}