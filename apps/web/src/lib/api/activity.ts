import type { ActivitySummary } from '@quill-collab/shared';
import { api } from './client';

export function listActivity(documentId: string): Promise<ActivitySummary[]> {
  return api<ActivitySummary[]>(`/documents/${documentId}/activity`);
}
