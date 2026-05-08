export interface DocumentSummary {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Document detail — content is managed via Yjs WebSocket, not REST */
export type DocumentDetail = DocumentSummary;

export interface CreateDocumentRequest {
  title?: string;
}

export interface UpdateDocumentRequest {
  title: string;
}
