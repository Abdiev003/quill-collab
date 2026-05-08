export interface DocumentSummary {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateDocumentRequest {
  title?: string;
}

export interface UpdateDocumentRequest {
  title: string;
}
