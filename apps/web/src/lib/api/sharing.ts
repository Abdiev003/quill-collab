import type {
  CreateShareRequest,
  ResolvedShare,
  ShareSummary,
} from '@quill-collab/shared';
import { api } from './client';

export function createShare(
  documentId: string,
  input: CreateShareRequest,
): Promise<ShareSummary> {
  return api<ShareSummary>(`/documents/${documentId}/shares`, {
    method: 'POST',
    json: input,
  });
}

export function listShares(documentId: string): Promise<ShareSummary[]> {
  return api<ShareSummary[]>(`/documents/${documentId}/shares`);
}

export function revokeShare(shareId: string): Promise<void> {
  return api<void>(`/shares/${shareId}`, { method: 'DELETE' });
}

export function resolveShareToken(token: string): Promise<ResolvedShare> {
  return api<ResolvedShare>(`/share/${token}`, { anonymous: true });
}
