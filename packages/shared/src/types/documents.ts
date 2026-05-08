export interface DocumentSummary {
  id: string;
  title: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type DocumentDetail = DocumentSummary;

export interface CreateDocumentRequest {
  title?: string;
}

export interface UpdateDocumentRequest {
  title: string;
}

export interface VersionSummary {
  id: string;
  documentId: string;
  preview: string;
  createdBy: string;
  createdAt: string;
}
