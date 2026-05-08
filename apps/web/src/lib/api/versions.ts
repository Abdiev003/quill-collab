import type { VersionSummary } from '@quill-collab/shared';
import { api } from './client';

export function listVersions(documentId: string): Promise<VersionSummary[]> {
  return api<VersionSummary[]>(`/documents/${documentId}/versions`);
}

export function restoreVersion(
  documentId: string,
  versionId: string,
): Promise<void> {
  return api<void>(`/documents/${documentId}/versions/${versionId}/restore`, {
    method: 'POST',
  });
}
