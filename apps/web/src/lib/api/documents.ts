import type {
  CreateDocumentRequest,
  DocumentSummary,
  UpdateDocumentRequest,
} from '@quill-collab/shared';
import { api } from './client';

export function listDocuments(): Promise<DocumentSummary[]> {
  return api<DocumentSummary[]>('/documents');
}

export function listTrashedDocuments(): Promise<DocumentSummary[]> {
  return api<DocumentSummary[]>('/documents/trash');
}

export function createDocument(input: CreateDocumentRequest = {}): Promise<DocumentSummary> {
  return api<DocumentSummary>('/documents', {
    method: 'POST',
    json: input,
  });
}

export function renameDocument(id: string, input: UpdateDocumentRequest): Promise<DocumentSummary> {
  return api<DocumentSummary>(`/documents/${id}`, {
    method: 'PATCH',
    json: input,
  });
}

export function softDeleteDocument(id: string): Promise<void> {
  return api<void>(`/documents/${id}`, { method: 'DELETE' });
}

export function restoreDocument(id: string): Promise<DocumentSummary> {
  return api<DocumentSummary>(`/documents/${id}/restore`, {
    method: 'POST',
  });
}

export function permanentlyDeleteDocument(id: string): Promise<void> {
  return api<void>(`/documents/${id}/permanent`, { method: 'DELETE' });
}

export function getDocument(id: string): Promise<DocumentSummary> {
  return api<DocumentSummary>(`/documents/${id}`);
}

