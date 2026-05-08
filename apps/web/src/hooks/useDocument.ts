'use client';

import type { DocumentSummary } from '@quill-collab/shared';
import {
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';
import { getDocument } from '@/lib/api/documents';

export const documentKeys = {
  detail: (id: string) => ['documents', 'detail', id] as const,
};

export function useDocument(id: string): UseQueryResult<DocumentSummary> {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => getDocument(id),
  });
}

